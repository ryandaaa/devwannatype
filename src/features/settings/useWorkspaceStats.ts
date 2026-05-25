import { useQuery } from "@tanstack/react-query";
import { getDb } from "../../db";

export interface WorkspaceStats {
  total: number;
  inbox: number;
  pinned: number;
  archived: number;
  trashed: number;
  byType: { markdown: number; snippet: number; command: number };
  byLanguage: Array<{ language: string; count: number }>;
  totalTags: number;
  totalChars: number;
  totalWords: number;
  oldestCreated: number | null;
  newestUpdated: number | null;
}

/** Hitung statistik workspace dari SQLite. Cheap karena dataset kecil. */
export function useWorkspaceStats() {
  return useQuery({
    queryKey: ["workspace-stats"],
    queryFn: async (): Promise<WorkspaceStats> => {
      const db = await getDb();
      const counts = await db.select<
        Array<{
          total: number;
          inbox: number;
          pinned: number;
          archived: number;
          trashed: number;
          md: number;
          snip: number;
          cmd: number;
          chars: number;
          oldest: number | null;
          newest: number | null;
        }>
      >(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN deleted_at IS NULL AND is_archived = 0 THEN 1 ELSE 0 END) AS inbox,
          SUM(CASE WHEN deleted_at IS NULL AND is_archived = 0 AND is_pinned = 1 THEN 1 ELSE 0 END) AS pinned,
          SUM(CASE WHEN deleted_at IS NULL AND is_archived = 1 THEN 1 ELSE 0 END) AS archived,
          SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS trashed,
          SUM(CASE WHEN type = 'markdown' THEN 1 ELSE 0 END) AS md,
          SUM(CASE WHEN type = 'snippet' THEN 1 ELSE 0 END) AS snip,
          SUM(CASE WHEN type = 'command' THEN 1 ELSE 0 END) AS cmd,
          SUM(LENGTH(content)) AS chars,
          MIN(created_at) AS oldest,
          MAX(updated_at) AS newest
        FROM notes
      `);
      const c = counts[0] ?? {
        total: 0,
        inbox: 0,
        pinned: 0,
        archived: 0,
        trashed: 0,
        md: 0,
        snip: 0,
        cmd: 0,
        chars: 0,
        oldest: null,
        newest: null,
      };

      const langRows = await db.select<Array<{ language: string | null; cnt: number }>>(
        `SELECT language, COUNT(*) AS cnt
         FROM notes
         WHERE language IS NOT NULL AND language != '' AND deleted_at IS NULL
         GROUP BY language
         ORDER BY cnt DESC, language ASC`,
      );

      const tagRow = await db.select<Array<{ cnt: number }>>(
        `SELECT COUNT(*) AS cnt FROM tags`,
      );

      const wordsRow = await db.select<Array<{ content: string }>>(
        `SELECT content FROM notes WHERE deleted_at IS NULL`,
      );
      const totalWords = wordsRow.reduce((acc, r) => {
        const stripped = (r.content || "")
          .replace(/```[\s\S]*?```/g, " ")
          .replace(/`[^`]*`/g, " ");
        return acc + stripped.split(/\s+/).filter(Boolean).length;
      }, 0);

      return {
        total: c.total ?? 0,
        inbox: c.inbox ?? 0,
        pinned: c.pinned ?? 0,
        archived: c.archived ?? 0,
        trashed: c.trashed ?? 0,
        byType: {
          markdown: c.md ?? 0,
          snippet: c.snip ?? 0,
          command: c.cmd ?? 0,
        },
        byLanguage: langRows.map((r) => ({ language: r.language ?? "", count: r.cnt })),
        totalTags: tagRow[0]?.cnt ?? 0,
        totalChars: c.chars ?? 0,
        totalWords,
        oldestCreated: c.oldest,
        newestUpdated: c.newest,
      };
    },
  });
}
