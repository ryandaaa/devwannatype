import { Icon } from "../Icon";
import { useToastStore, type ToastKind } from "./toastStore";

const ICONS: Record<ToastKind, string> = {
  info: "info",
  success: "check_circle",
  error: "error",
};

/**
 * Toast viewport — floating bottom-right, max 3, auto-dismiss.
 * Mount sekali di App. Tidak ada animasi yang berlebihan, fade-in saja.
 */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-md right-md z-50 flex flex-col-reverse gap-xs pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-sm px-md py-sm border bg-surface-container-low max-w-[360px] dwt-fade ${
            t.kind === "error"
              ? "border-error"
              : t.kind === "success"
                ? "border-outline-variant"
                : "border-surface-container-high"
          }`}
        >
          <Icon
            name={ICONS[t.kind]}
            size={14}
            className={
              t.kind === "error"
                ? "text-error mt-[2px]"
                : t.kind === "success"
                  ? "text-on-surface mt-[2px]"
                  : "text-on-surface-variant mt-[2px]"
            }
          />
          <div className="flex-1 min-w-0">
            <div className="font-code text-body-sm text-on-surface break-words">
              {t.message}
            </div>
            {t.detail && (
              <div className="font-code text-[11px] text-on-surface-variant break-all mt-[2px] opacity-80">
                {t.detail}
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
