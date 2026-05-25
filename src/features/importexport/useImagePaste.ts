import { useEffect } from "react";
import { writeFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { CodeMirrorEditorHandle } from "../editor/CodeMirrorEditor";
import type { NoteWithTags } from "../notes/hooks";

interface UseImagePasteOpts {
  note: NoteWithTags | null | undefined;
  editorRef: React.RefObject<CodeMirrorEditorHandle | null>;
}

/**
 * Image paste — saat user paste image dari clipboard di markdown note aktif,
 * simpan ke `app_data_dir/images/` dan sisipkan markdown image link via
 * editor handle (supaya editor view langsung update).
 */
export function useImagePaste({ note, editorRef }: UseImagePasteOpts) {
  useEffect(() => {
    if (!note || note.type !== "markdown") return;

    async function ensureDir(): Promise<string> {
      const base = await appDataDir();
      const dir = await join(base, "images");
      const here = await exists(dir).catch(() => false);
      if (!here) await mkdir(dir, { recursive: true }).catch(() => undefined);
      return dir;
    }

    async function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;
      let imageItem: DataTransferItem | null = null;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === "file" && it.type.startsWith("image/")) {
          imageItem = it;
          break;
        }
      }
      if (!imageItem) return;

      // Skip jika target adalah input/textarea biasa (selain CodeMirror)
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
      }

      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const buf = new Uint8Array(await file.arrayBuffer());

      const ext = (file.type.split("/")[1] ?? "png").replace(/[^a-z0-9]/g, "") || "png";
      const ts = Date.now();
      const filename = `paste-${ts}.${ext}`;
      const dir = await ensureDir();
      const fullPath = await join(dir, filename);
      await writeFile(fullPath, buf);

      const md = `![](${fullPath.replace(/\\/g, "/")})`;
      const handle = editorRef.current;
      if (!handle) return;
      const view = handle.getView();
      if (!view) return;
      // Insert at cursor; tambah newline kalau bukan di awal line
      const range = view.state.selection.main;
      const lineAt = view.state.doc.lineAt(range.from);
      const atLineStart = range.from === lineAt.from;
      const insert = atLineStart ? `${md}\n` : `\n${md}\n`;
      view.dispatch({
        changes: { from: range.from, insert },
        selection: { anchor: range.from + insert.length },
      });
      view.focus();
    }

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [note, editorRef]);
}
