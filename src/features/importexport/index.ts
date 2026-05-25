import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import type { NoteType } from "../../db/schema";
import type { NoteWithTags } from "../notes/hooks";
import { getDb } from "../../db";
import type { NoteRow } from "../../db/schema";

const EXT_FOR_TYPE: Record<NoteType, { ext: string; name: string }> = {
  markdown: { ext: "md", name: "Markdown" },
  snippet: { ext: "txt", name: "Text" },
  command: { ext: "sh", name: "Shell script" },
};

function defaultFilename(note: NoteWithTags): string {
  const slug =
    (note.title || "untitled")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "untitled";
  let ext = EXT_FOR_TYPE[note.type].ext;
  // Snippet pakai ext sesuai bahasa kalau ada
  if (note.type === "snippet" && note.language) {
    const langExt = languageToExt(note.language);
    if (langExt) ext = langExt;
  }
  return `${slug}.${ext}`;
}

function languageToExt(lang: string): string | null {
  const map: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    rust: "rs",
    go: "go",
    sql: "sql",
    json: "json",
    html: "html",
    css: "css",
    yaml: "yml",
    bash: "sh",
    shell: "sh",
    markdown: "md",
  };
  return map[lang.toLowerCase()] ?? null;
}

/** Export note ke file. Return path tujuan, atau null jika user cancel. */
export async function exportNoteToFile(note: NoteWithTags): Promise<string | null> {
  const filename = defaultFilename(note);
  const meta = EXT_FOR_TYPE[note.type];
  const ext = filename.split(".").pop() ?? meta.ext;
  const filters = [
    { name: meta.name, extensions: [ext] },
    { name: "All files", extensions: ["*"] },
  ];
  const path = await save({ defaultPath: filename, filters });
  if (!path) return null;
  await writeTextFile(path, note.content);
  return path;
}

/** Import 1+ file markdown sebagai note baru. Return jumlah file ter-import + last id. */
export async function importMarkdownFiles(): Promise<
  Array<{ title: string; content: string }>
> {
  const result = await open({
    multiple: true,
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
  });
  if (!result) return [];
  const paths = Array.isArray(result) ? result : [result];
  const out: Array<{ title: string; content: string }> = [];
  for (const p of paths) {
    try {
      const content = await readTextFile(p);
      const filename = p.split(/[\\/]/).pop() ?? "imported.md";
      const title = filename.replace(/\.(md|markdown)$/i, "");
      out.push({ title, content });
    } catch (e) {
      console.error("[import] failed:", p, e);
    }
  }
  return out;
}



/** Export semua note aktif (Inbox + Pinned + Archive — bukan Trash) ke folder
 *  pilihan user. Setiap note jadi file dengan ext sesuai tipe. Folder structure:
 *
 *    <chosen-folder>/
 *      inbox/
 *        <slug>.md
 *      archive/
 *        <slug>.md
 *
 *  Return summary { written, skipped, folder }. */
export interface ExportAllSummary {
  folder: string;
  written: number;
  skipped: number;
}

export async function exportAllNotes(): Promise<ExportAllSummary | null> {
  const folder = await open({
    directory: true,
    multiple: false,
  });
  if (!folder || Array.isArray(folder)) return null;

  const db = await getDb();
  const rows = await db.select<NoteRow[]>(
    `SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC`,
  );
  let written = 0;
  let skipped = 0;
  const usedNames = new Map<string, number>(); // per subfolder

  for (const note of rows) {
    try {
      const sub = note.is_archived === 1 ? "archive" : "inbox";
      const subPath = await join(folder, sub);
      const subExists = await exists(subPath).catch(() => false);
      if (!subExists) await mkdir(subPath, { recursive: true });

      const baseSlug =
        (note.title || "untitled")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60) || "untitled";

      let ext = note.type === "markdown" ? "md" : note.type === "command" ? "sh" : "txt";
      if (note.type === "snippet" && note.language) {
        const langExt = languageToExt(note.language);
        if (langExt) ext = langExt;
      }

      const key = `${sub}/${baseSlug}.${ext}`;
      const count = (usedNames.get(key) ?? 0) + 1;
      usedNames.set(key, count);
      const finalName = count === 1 ? `${baseSlug}.${ext}` : `${baseSlug}-${count}.${ext}`;

      const fullPath = await join(subPath, finalName);
      await writeTextFile(fullPath, note.content);
      written++;
    } catch (e) {
      console.error("[export-all] failed:", note.id, e);
      skipped++;
    }
  }

  return { folder, written, skipped };
}
