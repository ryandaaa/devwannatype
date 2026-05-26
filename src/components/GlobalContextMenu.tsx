import { useEffect, useState } from "react";
import { ContextMenu, type ContextMenuState, type MenuItem } from "./ContextMenu";

/**
 * Global right-click handler — render custom ContextMenu untuk SEMUA right-click
 * di app, biar visual konsisten dengan tema (bukan native WebKit menu).
 *
 * Skip kalau React onContextMenu handler lain udah call preventDefault (e.g. NoteList,
 * EditorMetaBar) — handler itu render menu sendiri.
 *
 * Items adaptif berdasarkan context:
 *  - editor (.cm-content) atau input/textarea → Cut/Copy/Paste/Select All
 *  - lainnya kalau ada selection → Copy aja
 *  - kalau gak ada apa-apa → menu nggak muncul (tapi tetep block native).
 */
export function GlobalContextMenu() {
  const [state, setState] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    function onCtx(e: MouseEvent) {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const items = buildItems(target);

      // Always preventDefault (we own context menus visually)
      e.preventDefault();

      if (items.length === 0) {
        setState(null);
        return;
      }
      setState({ x: e.clientX, y: e.clientY, items });
    }

    document.addEventListener("contextmenu", onCtx);
    return () => document.removeEventListener("contextmenu", onCtx);
  }, []);

  return <ContextMenu state={state} onClose={() => setState(null)} />;
}

function buildItems(target: HTMLElement): MenuItem[] {
  const inCm = !!target.closest(".cm-content");
  const inInput =
    target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
  const editable = inCm || inInput;

  const sel = window.getSelection?.()?.toString() ?? "";
  const hasSelection = sel.length > 0;

  const items: MenuItem[] = [];

  if (editable) {
    items.push({
      label: "Cut",
      icon: "content_cut",
      onClick: () => {
        if (!hasSelection) return;
        try {
          document.execCommand("cut");
        } catch {
          /* ignore */
        }
      },
    });
  }

  items.push({
    label: "Copy",
    icon: "content_copy",
    onClick: () => {
      if (!hasSelection) return;
      try {
        document.execCommand("copy");
      } catch {
        // Fallback to clipboard API
        navigator.clipboard.writeText(sel).catch(() => {});
      }
    },
  });

  if (editable) {
    items.push({
      label: "Paste",
      icon: "content_paste",
      onClick: async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (!text) return;
          // Try execCommand insertText (works in contenteditable, including CM)
          if (!document.execCommand("insertText", false, text)) {
            // Fallback: dispatch a paste event so CM picks it up
            const dt = new DataTransfer();
            dt.setData("text/plain", text);
            target.dispatchEvent(
              new ClipboardEvent("paste", {
                clipboardData: dt,
                bubbles: true,
                cancelable: true,
              }),
            );
          }
        } catch (err) {
          console.error("[paste] failed:", err);
        }
      },
    });

    items.push({ label: "", separator: true });

    items.push({
      label: "Select All",
      icon: "select_all",
      onClick: () => {
        try {
          document.execCommand("selectAll");
        } catch {
          /* ignore */
        }
      },
    });
  }

  return items;
}
