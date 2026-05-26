import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useCreateNote } from "../notes/hooks";
import { useLayoutStore } from "../layout/store";

/**
 * Pending files import — dipakai saat user double-click .md/.txt/.markdown di
 * File Explorer dan OS membuka devwannatype dengan file path sebagai argv.
 *
 * Rust side memegang antrian. Kita tarik antrian saat mount, dan listen event
 * 'dwt://pending-files-changed' yang di-emit oleh single-instance plugin saat
 * user buka file lain padahal app sudah jalan.
 */
export function usePendingFiles() {
  const createNote = useCreateNote();
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);
  const setActiveView = useLayoutStore((s) => s.setActiveView);

  useEffect(() => {
    let cancelled = false;

    async function drain() {
      try {
        const paths = await invoke<string[]>("take_pending_files");
        if (cancelled || !paths || paths.length === 0) return;
        let lastId = "";
        for (const p of paths) {
          try {
            const content = await readTextFile(p);
            const filename = p.split(/[\\/]/).pop() ?? "imported";
            const isMd = /\.(md|markdown)$/i.test(filename);
            const title = filename.replace(/\.(md|markdown|txt)$/i, "");
            const note = await createNote.mutateAsync({
              type: isMd ? "markdown" : "snippet",
              title,
              content,
              sourcePath: p,
            });
            lastId = note.id;
          } catch (e) {
            console.error("[pending] failed to import:", p, e);
          }
        }
        if (lastId) {
          setActiveView("inbox");
          setSelectedNoteId(lastId);
        }
      } catch (e) {
        console.error("[pending] take failed:", e);
      }
    }

    void drain();

    let unlisten: (() => void) | null = null;
    listen("dwt://pending-files-changed", () => {
      void drain();
    })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [createNote, setSelectedNoteId, setActiveView]);
}
