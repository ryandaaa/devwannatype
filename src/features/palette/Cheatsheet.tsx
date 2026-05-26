import { useEffect } from "react";
import { Icon } from "../../components/Icon";
import { Overlay } from "../../components/Overlay";

interface CheatsheetProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<{ section: string; items: Array<{ keys: string; label: string }> }> = [
  {
    section: "notes",
    items: [
      { keys: "Ctrl+N", label: "new note" },
      { keys: "Ctrl+O", label: "open file (import .md)" },
      { keys: "Ctrl+W", label: "close current note" },
      { keys: "Ctrl+S", label: "flush save" },
      { keys: "Ctrl+Z", label: "undo (in editor)" },
      { keys: "Ctrl+Y", label: "redo (in editor)" },
      { keys: "Ctrl+F", label: "find in note" },
      { keys: "↑ / ↓", label: "navigate note list" },
    ],
  },
  {
    section: "layout",
    items: [
      { keys: "Ctrl+B", label: "toggle sidebar — overridden by bold inside markdown editor" },
      { keys: "Ctrl+\\", label: "toggle markdown preview" },
      { keys: "F11", label: "zen mode" },
    ],
  },
  {
    section: "markdown formatting (inside editor)",
    items: [
      { keys: "Ctrl+B", label: "bold (**text**)" },
      { keys: "Ctrl+I", label: "italic (*text*)" },
      { keys: "Ctrl+U", label: "underline (<u>text</u>)" },
      { keys: "Ctrl+Shift+X", label: "strikethrough (~~text~~)" },
      { keys: "Ctrl+K", label: "insert link [text](url)" },
      { keys: "Ctrl+1..6", label: "toggle heading level" },
      { keys: "Ctrl+Shift+L", label: "toggle bullet list" },
      { keys: "Ctrl+Shift+O", label: "toggle ordered list" },
      { keys: "Ctrl+Shift+.", label: "toggle blockquote" },
    ],
  },
  {
    section: "search & navigation",
    items: [
      { keys: "Ctrl+K", label: "command palette — overridden by link inside editor" },
      { keys: "?", label: "this cheatsheet" },
      { keys: "Esc", label: "close overlays" },
    ],
  },
  {
    section: "in note list",
    items: [
      { keys: "Right-click", label: "pin / archive / move to trash" },
      { keys: "Ctrl+Click", label: "toggle in bulk selection" },
      { keys: "Shift+Click", label: "range bulk select" },
      { keys: "Click tag", label: "filter by that tag" },
    ],
  },
];

export function Cheatsheet({ open, onClose }: CheatsheetProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <Overlay open={open} onBackdropClick={onClose} position="center" ariaLabel="Keyboard shortcuts">
      <div className="w-[560px] max-w-[90vw] max-h-[80vh] overflow-y-auto bg-surface-container-low border border-surface-container-high">
        <div className="flex items-center justify-between px-md h-[44px] border-b border-surface-container-high">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Keyboard shortcuts
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="px-md py-md flex flex-col gap-md">
          {SHORTCUTS.map((sec) => (
            <section key={sec.section}>
              <div className="font-code text-[10px] text-on-surface-variant uppercase tracking-wider mb-xs opacity-80">
                {sec.section}
              </div>
              <div className="flex flex-col">
                {sec.items.map((it) => (
                  <div
                    key={it.keys}
                    className="flex items-center justify-between py-xs font-code text-body-sm text-on-surface"
                  >
                    <span>{it.label}</span>
                    <Kbd combo={it.keys} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

function Kbd({ combo }: { combo: string }) {
  // Split by "+" untuk render tiap key sebagai chip
  const parts = combo.split(/\s*\+\s*/);
  return (
    <span className="flex items-center gap-xs">
      {parts.map((p, i) => (
        <kbd
          key={i}
          className="font-code text-[10px] text-on-surface-variant border border-surface-container-high px-xs py-[1px] bg-background"
        >
          {p}
        </kbd>
      ))}
    </span>
  );
}
