import { useEffect } from "react";
import { isMod } from "../../lib/debounce";
import { useLayoutStore } from "../layout/store";
import { useCreateAndSelectNote } from "../notes/useCreateAndSelectNote";
import { useCreateNote } from "../notes/hooks";
import { useOverlayStore } from "../palette/overlayStore";
import { importMarkdownFiles } from "../importexport";
import { useSaveBus } from "../editor/saveBus";

/**
 * Global keyboard shortcuts — cross-OS (Cmd di mac, Ctrl di lainnya).
 * - Mod+B  → toggle sidebar          (overridden by bold inside markdown editor)
 * - Mod+\\ → toggle preview
 * - Mod+N  → new note
 * - Mod+K  → command palette         (overridden by link inside markdown editor)
 * - Mod+W  → close current note (deselect)
 * - Mod+O  → open import file dialog
 * - F11    → zen mode
 * - ?      → cheatsheet (kalau bukan di input)
 * - Esc    → tutup overlay
 *
 * Mod+Z (undo) dan Mod+S (flush save) di-handle internal di CodeMirror
 * untuk note aktif. Mod+F (find in note) juga internal.
 */
export function useGlobalShortcuts() {
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const togglePreview = useLayoutStore((s) => s.togglePreview);
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);
  const setActiveView = useLayoutStore((s) => s.setActiveView);
  const create = useCreateAndSelectNote();
  const createNote = useCreateNote();
  const togglePalette = useOverlayStore((s) => s.togglePalette);
  const setPaletteOpen = useOverlayStore((s) => s.setPaletteOpen);
  const toggleCheatsheet = useOverlayStore((s) => s.toggleCheatsheet);
  const setCheatsheetOpen = useOverlayStore((s) => s.setCheatsheetOpen);
  const setSettingsOpen = useOverlayStore((s) => s.setSettingsOpen);

  useEffect(() => {
    function inEditableField(target: EventTarget | null): boolean {
      const t = target as HTMLElement | null;
      if (!t) return false;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return true;
      if (t.isContentEditable) return true;
      if (t.closest(".cm-content")) return true;
      return false;
    }

    async function handleOpenFile() {
      try {
        const items = await importMarkdownFiles();
        if (items.length === 0) return;
        let lastId = "";
        for (const item of items) {
          const note = await createNote.mutateAsync({
            type: "markdown",
            title: item.title,
            content: item.content,
            sourcePath: item.sourcePath,
          });
          lastId = note.id;
        }
        if (lastId) {
          setActiveView("inbox");
          setSelectedNoteId(lastId);
        }
      } catch (e) {
        console.error("[open] failed:", e);
      }
    }

    function onKey(e: KeyboardEvent) {
      // Esc — close overlays
      if (e.key === "Escape") {
        const o = useOverlayStore.getState();
        if (o.paletteOpen) {
          setPaletteOpen(false);
          return;
        }
        if (o.cheatsheetOpen) {
          setCheatsheetOpen(false);
          return;
        }
        if (o.settingsOpen) {
          setSettingsOpen(false);
          return;
        }
      }

      // ? — cheatsheet (hanya kalau bukan di input)
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey && !inEditableField(e.target)) {
        e.preventDefault();
        toggleCheatsheet();
        return;
      }

      if (!isMod(e)) return;
      const k = e.key.toLowerCase();
      if (k === "b") {
        // Skip kalau di editor — biar Word-shortcut bold yang ambil
        if (inEditableField(e.target)) return;
        e.preventDefault();
        toggleSidebar();
      } else if (k === "\\") {
        e.preventDefault();
        togglePreview();
      } else if (k === "n") {
        e.preventDefault();
        void create.mutateAsync();
      } else if (k === "k") {
        // Skip kalau di markdown editor — biar Word-shortcut link yang ambil
        if (inEditableField(e.target)) return;
        e.preventDefault();
        togglePalette();
      } else if (k === "w") {
        e.preventDefault();
        setSelectedNoteId(null);
      } else if (k === "o" && !e.shiftKey) {
        e.preventDefault();
        void handleOpenFile();
      } else if (k === "s") {
        // Selalu preventDefault Ctrl+S — browser default = save webpage dialog.
        // Forward ke save bus yang di-register oleh EditorArea (kalau ada).
        e.preventDefault();
        useSaveBus.getState().flush();
      }
    }
    function onKeyExtra(e: KeyboardEvent) {
      // F11 — zen mode
      if (e.key === "F11") {
        e.preventDefault();
        useLayoutStore.getState().toggleZen();
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onKeyExtra);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onKeyExtra);
    };
  }, [
    toggleSidebar,
    togglePreview,
    create,
    createNote,
    togglePalette,
    setPaletteOpen,
    toggleCheatsheet,
    setCheatsheetOpen,
    setSettingsOpen,
    setSelectedNoteId,
    setActiveView,
  ]);
}
