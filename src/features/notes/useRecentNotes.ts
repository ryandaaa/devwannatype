import { useQuery } from "@tanstack/react-query";
import { getDb } from "../../db";
import type { NoteRow } from "../../db/schema";

/** Ambil N note terakhir di-edit (active, tidak archived/trashed). */
export function useRecentNotes(limit = 5) {
  return useQuery({
    queryKey: ["recent-notes", limit],
    queryFn: async (): Promise<NoteRow[]> => {
      const db = await getDb();
      return await db.select<NoteRow[]>(
        `SELECT * FROM notes
         WHERE deleted_at IS NULL AND is_archived = 0
         ORDER BY updated_at DESC
         LIMIT ?`,
        [limit],
      );
    },
  });
}
