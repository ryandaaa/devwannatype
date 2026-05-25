import { useEffect, useRef } from "react";
import { Overlay } from "../Overlay";
import { useConfirmStore } from "./confirmStore";

/**
 * ConfirmDialog — single instance, di-trigger via confirmDialog() helper.
 * Auto-focus tombol confirm saat open. Esc = cancel.
 */
export function ConfirmDialog() {
  const pending = useConfirmStore((s) => s.pending);
  const close = useConfirmStore((s) => s.close);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pending) return;
    const id = window.requestAnimationFrame(() => confirmRef.current?.focus());
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") {
        e.preventDefault();
        close(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [pending, close]);

  return (
    <Overlay
      open={!!pending}
      onBackdropClick={() => close(false)}
      position="center"
      ariaLabel={pending?.title}
    >
      <div className="w-[420px] max-w-[90vw] bg-surface-container-low border border-surface-container-high">
        <div className="px-md pt-md">
          <div className="font-headline-sm text-headline-sm text-on-surface mb-xs">
            {pending?.title}
          </div>
          <div className="font-code text-body-sm text-on-surface-variant leading-relaxed">
            {pending?.message}
          </div>
          {pending?.detail && (
            <div className="font-code text-body-sm text-on-surface-variant opacity-70 leading-relaxed mt-sm break-words">
              {pending.detail}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-sm px-md py-md border-t border-surface-container-high mt-md">
          <button
            type="button"
            onClick={() => close(false)}
            className="px-md py-xs font-code text-body-sm text-on-surface-variant hover:text-on-surface border border-surface-container-high hover:border-outline-variant transition-colors"
          >
            {pending?.cancelLabel ?? "cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => close(true)}
            className={`px-md py-xs font-code text-body-sm border transition-colors ${
              pending?.danger
                ? "text-error border-error hover:bg-error-container hover:text-on-error-container"
                : "text-on-surface border-outline-variant hover:bg-surface-container-high"
            }`}
          >
            {pending?.confirmLabel ?? "confirm"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
