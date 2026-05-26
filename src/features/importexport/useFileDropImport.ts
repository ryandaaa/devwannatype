import { useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useCreateNote } from "../notes/hooks";
import { useLayoutStore } from "../layout/store";
import { detectLanguage } from "../editor/detectLanguage";
import { toast } from "../../components/toast/toastStore";

/**
 * Drag-drop file import — drop file .md / .txt di window → buat note baru.
 * Listener di-register sekali (deps `[]`); callback membaca state via ref
 * supaya tidak re-register setiap render.
 */
export function useFileDropImport() {
  const createNote = useCreateNote();
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);
  const setActiveView = useLayoutStore((s) => s.setActiveView);
  const [hovering, setHovering] = useState(false);

  // Ref ke handler aktual — di-update tiap render tapi listener register tetap.
  const handlerRef = useRef<(paths: string[]) => Promise<void>>(async () => {});
  // Guard untuk drop kembar (Tauri kadang fire duplicate event).
  const inFlightRef = useRef(false);
  const lastFingerprintRef = useRef<string>("");

  useEffect(() => {
    handlerRef.current = async (paths: string[]) => {
      if (inFlightRef.current) return;
      // Fingerprint = sorted joined paths — duplicate drops dalam 1.5s di-skip
      const fp = [...paths].sort().join("|");
      if (fp === lastFingerprintRef.current) return;
      lastFingerprintRef.current = fp;
      window.setTimeout(() => {
        if (lastFingerprintRef.current === fp) lastFingerprintRef.current = "";
      }, 1500);

      inFlightRef.current = true;
      try {
        let lastId = "";
        let count = 0;
        for (const p of paths) {
          try {
            if (!/\.(md|markdown|txt)$/i.test(p)) continue;
            const content = await readTextFile(p);
            const filename = p.split(/[\\/]/).pop() ?? "imported";
            const title = filename.replace(/\.(md|markdown|txt)$/i, "");
            const isMd = /\.(md|markdown)$/i.test(p);
            const note = await createNote.mutateAsync({
              type: isMd ? "markdown" : "snippet",
              title,
              content,
              language: isMd ? null : detectLanguage(content),
              sourcePath: p,
            });
            lastId = note.id;
            count++;
          } catch (err) {
            console.error("[drop] failed:", p, err);
          }
        }
        if (lastId) {
          setActiveView("inbox");
          setSelectedNoteId(lastId);
          toast.success(`${count} ${count === 1 ? "note" : "notes"} imported`);
        }
      } finally {
        inFlightRef.current = false;
      }
    };
  });

  useEffect(() => {
    const webview = getCurrentWebview();
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const fn = await webview.onDragDropEvent((event) => {
        const payload = event.payload as
          | { type: "enter" | "over" | "drop" | "leave"; paths?: string[] };
        if (payload.type === "enter" || payload.type === "over") {
          setHovering(true);
        } else if (payload.type === "leave") {
          setHovering(false);
        } else if (payload.type === "drop") {
          setHovering(false);
          const paths = payload.paths ?? [];
          if (paths.length > 0) void handlerRef.current(paths);
        }
      });
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { hovering };
}
