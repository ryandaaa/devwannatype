import { useEffect, useRef, useState, type ReactNode } from "react";

export interface MenuItem {
  label: string;
  icon?: string;
  danger?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

interface ContextMenuProps {
  state: ContextMenuState | null;
  onClose: () => void;
}

/**
 * Floating context menu. No library, no animation.
 * Positioned at click coords; auto-close on outside click / Escape / scroll.
 */
export function ContextMenu({ state, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!state) {
      setAdjusted(null);
      return;
    }
    // Adjust agar tidak keluar viewport
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) {
      setAdjusted({ x: state.x, y: state.y });
      return;
    }
    const w = rect.width || 200;
    const h = rect.height || 200;
    let x = state.x;
    let y = state.y;
    if (x + w > window.innerWidth) x = window.innerWidth - w - 4;
    if (y + h > window.innerHeight) y = window.innerHeight - h - 4;
    setAdjusted({ x, y });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const handleDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleScroll = () => onClose();
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [state, onClose]);

  if (!state) return null;

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        position: "fixed",
        left: `${adjusted?.x ?? state.x}px`,
        top: `${adjusted?.y ?? state.y}px`,
        visibility: adjusted ? "visible" : "hidden",
      }}
      className="z-50 min-w-[180px] bg-surface-container-low border border-surface-container-high py-xs shadow-none"
    >
      {state.items.map((item, idx) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${idx}`}
              className="my-xs border-t border-surface-container-high"
            />
          );
        }
        return (
          <button
            key={item.label + idx}
            type="button"
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={`w-full flex items-center gap-sm px-md py-xs font-code text-body-sm text-left transition-colors ${
              item.danger
                ? "text-error hover:bg-surface-container-high"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            {item.icon && (
              <span className={`material-symbols-outlined`} style={{ fontSize: "14px" }}>
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface MenuRendererProps {
  children: (open: (ev: { x: number; y: number; items: MenuItem[] }) => void) => ReactNode;
}

/** Container yang menyediakan callback open(...) untuk children, plus mount menu. */
export function ContextMenuHost({ children }: MenuRendererProps) {
  const [state, setState] = useState<ContextMenuState | null>(null);
  return (
    <>
      {children((ev) => setState(ev))}
      <ContextMenu state={state} onClose={() => setState(null)} />
    </>
  );
}
