import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDb } from "../../db";
import { VIEW_FILTERS, type NoteRow, type NoteType, type ViewId, type TagRow } from "../../db/schema";
import { uid, now } from "../../lib/id";

export interface NoteWithTags extends NoteRow {
  tags: string[];
}

const NOTES_KEY = (view: ViewId) => ["notes", view];

/** Ambil notes per view + tag-nya, sort by pinned desc + updated_at desc. */
export function useNotes(view: ViewId) {
  return useQuery({
    queryKey: NOTES_KEY(view),
    queryFn: async (): Promise<NoteWithTags[]> => {
      const db = await getDb();
      const where = VIEW_FILTERS[view];
      const notes = await db.select<NoteRow[]>(
        `SELECT * FROM notes WHERE ${where} ORDER BY is_pinned DESC, updated_at DESC`,
      );
      if (notes.length === 0) return [];
      const placeholders = notes.map(() => "?").join(",");
      const ids = notes.map((n) => n.id);
      const tagRows = await db.select<{ note_id: string; name: string }[]>(
        `SELECT nt.note_id, t.name
         FROM note_tags nt
         JOIN tags t ON t.id = nt.tag_id
         WHERE nt.note_id IN (${placeholders})`,
        ids,
      );
      const tagMap = new Map<string, string[]>();
      for (const row of tagRows) {
        const arr = tagMap.get(row.note_id);
        if (arr) arr.push(row.name);
        else tagMap.set(row.note_id, [row.name]);
      }
      return notes.map((n) => ({ ...n, tags: tagMap.get(n.id) ?? [] }));
    },
  });
}

/** Ambil 1 note (untuk editor). */
export function useNote(noteId: string | null) {
  return useQuery({
    queryKey: ["note", noteId],
    enabled: !!noteId,
    queryFn: async (): Promise<NoteWithTags | null> => {
      if (!noteId) return null;
      const db = await getDb();
      const notes = await db.select<NoteRow[]>("SELECT * FROM notes WHERE id = ?", [noteId]);
      if (notes.length === 0) return null;
      const tagRows = await db.select<{ name: string }[]>(
        `SELECT t.name FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = ?`,
        [noteId],
      );
      return { ...notes[0], tags: tagRows.map((r) => r.name) };
    },
  });
}

interface CreateNoteInput {
  type?: NoteType;
  language?: string | null;
  title?: string;
  content?: string;
  sourcePath?: string | null;
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateNoteInput = {}): Promise<NoteRow> => {
      const db = await getDb();
      const id = uid();
      const ts = now();
      const note: NoteRow = {
        id,
        title: input.title ?? "",
        type: input.type ?? "markdown",
        language: input.language ?? null,
        content: input.content ?? "",
        is_pinned: 0,
        is_archived: 0,
        deleted_at: null,
        last_export_path: null,
        source_path: input.sourcePath ?? null,
        created_at: ts,
        updated_at: ts,
      };
      await db.execute(
        `INSERT INTO notes (id, title, type, language, content, is_pinned, is_archived, deleted_at, last_export_path, source_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, NULL, NULL, ?, ?, ?)`,
        [note.id, note.title, note.type, note.language, note.content, note.source_path, note.created_at, note.updated_at],
      );
      return note;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

interface UpdateMetaInput {
  id: string;
  title?: string;
  type?: NoteType;
  language?: string | null;
}

export function useUpdateNoteMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMetaInput) => {
      const db = await getDb();
      const sets: string[] = [];
      const args: (string | number | null)[] = [];
      if (input.title !== undefined) {
        sets.push("title = ?");
        args.push(input.title);
      }
      if (input.type !== undefined) {
        sets.push("type = ?");
        args.push(input.type);
      }
      if (input.language !== undefined) {
        sets.push("language = ?");
        args.push(input.language);
      }
      if (sets.length === 0) return;
      sets.push("updated_at = ?");
      args.push(now());
      args.push(input.id);
      await db.execute(`UPDATE notes SET ${sets.join(", ")} WHERE id = ?`, args);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["note", vars.id] });
    },
  });
}

export function useUpdateNoteContent() {
  const qc = useQueryClient();
  return useMutation({
    // Per-note key — mutations untuk note yang sama akan queue (scope: "serial")
    // sehingga response tidak out-of-order saat user mengetik cepat.
    scope: { id: "update-note-content" },
    mutationFn: async (input: { id: string; content: string }) => {
      const db = await getDb();
      await db.execute(`UPDATE notes SET content = ?, updated_at = ? WHERE id = ?`, [
        input.content,
        now(),
        input.id,
      ]);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["note", vars.id] });
    },
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDb();
      await db.execute(
        `UPDATE notes SET is_pinned = CASE is_pinned WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?`,
        [now(), id],
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useToggleArchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDb();
      await db.execute(
        `UPDATE notes SET is_archived = CASE is_archived WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?`,
        [now(), id],
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useSoftDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDb();
      await db.execute(`UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
        now(),
        now(),
        id,
      ]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useRestoreFromTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDb();
      await db.execute(`UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE id = ?`, [
        now(),
        id,
      ]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function usePermanentDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDb();
      await db.execute(`DELETE FROM notes WHERE id = ?`, [id]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

/** ─── Bulk equivalents — single SQL untuk N ids ─── */
function placeholders(n: number): string {
  return new Array(n).fill("?").join(",");
}

export function useBulkTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const db = await getDb();
      await db.execute(
        `UPDATE notes
         SET is_pinned = CASE is_pinned WHEN 1 THEN 0 ELSE 1 END,
             updated_at = ?
         WHERE id IN (${placeholders(ids.length)})`,
        [now(), ...ids],
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useBulkToggleArchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const db = await getDb();
      await db.execute(
        `UPDATE notes
         SET is_archived = CASE is_archived WHEN 1 THEN 0 ELSE 1 END,
             updated_at = ?
         WHERE id IN (${placeholders(ids.length)})`,
        [now(), ...ids],
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useBulkSoftDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const db = await getDb();
      const ts = now();
      await db.execute(
        `UPDATE notes
         SET deleted_at = ?, updated_at = ?
         WHERE id IN (${placeholders(ids.length)})`,
        [ts, ts, ...ids],
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useBulkRestore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const db = await getDb();
      await db.execute(
        `UPDATE notes
         SET deleted_at = NULL, updated_at = ?
         WHERE id IN (${placeholders(ids.length)})`,
        [now(), ...ids],
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useBulkPermanentDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const db = await getDb();
      await db.execute(
        `DELETE FROM notes WHERE id IN (${placeholders(ids.length)})`,
        ids,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUpdateLastExportPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; path: string }) => {
      const db = await getDb();
      await db.execute(`UPDATE notes SET last_export_path = ? WHERE id = ?`, [
        input.path,
        input.id,
      ]);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["note", vars.id] });
    },
  });
}

export function useUpdateNoteSourcePath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; path: string | null }) => {
      const db = await getDb();
      await db.execute(`UPDATE notes SET source_path = ? WHERE id = ?`, [
        input.path,
        input.id,
      ]);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["note", vars.id] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

/** Ambil semua tag (untuk autocomplete). */
export function useAllTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async (): Promise<TagRow[]> => {
      const db = await getDb();
      return await db.select<TagRow[]>(`SELECT * FROM tags ORDER BY name`);
    },
  });
}

/** Tambahkan tag (buat baru jika perlu) ke note. */
export function useAddTagToNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { noteId: string; name: string }) => {
      const trimmed = input.name.trim().toLowerCase();
      if (!trimmed) return;
      const db = await getDb();
      // Cari atau buat tag
      const existing = await db.select<TagRow[]>(`SELECT * FROM tags WHERE name = ?`, [trimmed]);
      let tagId: string;
      if (existing.length > 0) {
        tagId = existing[0].id;
      } else {
        tagId = uid();
        await db.execute(`INSERT INTO tags (id, name) VALUES (?, ?)`, [tagId, trimmed]);
      }
      // Hubungkan
      await db.execute(
        `INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)`,
        [input.noteId, tagId],
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["note", vars.noteId] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useRemoveTagFromNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { noteId: string; name: string }) => {
      const db = await getDb();
      const existing = await db.select<TagRow[]>(`SELECT * FROM tags WHERE name = ?`, [
        input.name.trim().toLowerCase(),
      ]);
      if (existing.length === 0) return;
      await db.execute(`DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?`, [
        input.noteId,
        existing[0].id,
      ]);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["note", vars.noteId] });
    },
  });
}
