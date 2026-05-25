import { useEffect, useRef, useState, type ReactNode } from "react";

interface OverlayProps {
  open: boolean;
  onBackdropClick?: () => void;
  position?: "center" | "top";
  topOffset?: string;
  children: ReactNode;
  ariaLabel?: string;
}

/**
 * Overlay reusable dengan fade transition.
 * Mounts saat open=true, animasi fade-in via class "shown".
 * Pas open jadi false, animasi fade-out lalu unmount setelah duration.
 */
export function Overlay({
  open,
  onBackdropClick,
  position = "center",
  topOffset = "8vh",
  children,
  ariaLabel,
}: OverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // RAF supaya transisi from opacity-0 ke shown ke-trigger
      const id = window.requestAnimationFrame(() => setShown(true));
      return () => window.cancelAnimationFrame(id);
    } else {
      setShown(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setMounted(false);
      }, 180);
      return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    }
  }, [open]);

  if (!mounted) return null;

  const wrapJustify =
    position === "center" ? "items-center" : `items-start`;

  return (
    <div
      role="dialog"
      aria-label={ariaLabel}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBackdropClick?.();
      }}
      style={position === "top" ? { paddingTop: topOffset } : undefined}
      className={`fixed inset-0 z-40 flex justify-center bg-background/60 dwt-fade ${wrapJustify} ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`dwt-overlay-content transition-transform duration-150 ease-out ${
          shown ? "translate-y-0" : "translate-y-[-6px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
