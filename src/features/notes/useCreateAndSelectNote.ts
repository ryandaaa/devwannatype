import { useCreateNote } from "./hooks";
import { useLayoutStore } from "../layout/store";
import type { ViewId } from "../../db/schema";

/**
 * Hook untuk buat note baru dan langsung select.
 * Memastikan view aktif valid (kalau di Trash/Archive/Pinned/Snippets, switch ke Inbox).
 * Selalu nonaktifkan preview supaya user langsung bisa mengetik di editor.
 */
export function useCreateAndSelectNote() {
  const create = useCreateNote();
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);
  const setActiveView = useLayoutStore((s) => s.setActiveView);
  const setShowPreview = useLayoutStore((s) => s.setShowPreview);
  const activeView = useLayoutStore((s) => s.activeView);

  return {
    isPending: create.isPending,
    mutateAsync: async (input: { type?: "markdown" | "snippet" | "command" } = {}) => {
      const safeViews: ViewId[] = ["inbox"];
      if (input.type === "snippet") safeViews.push("snippets");
      if (!safeViews.includes(activeView)) {
        setActiveView("inbox");
      }
      const note = await create.mutateAsync({ type: input.type ?? "markdown" });
      setSelectedNoteId(note.id);
      // Always start in edit mode — preview empty content terasa broken untuk user.
      setShowPreview(false);
      return note;
    },
  };
}
