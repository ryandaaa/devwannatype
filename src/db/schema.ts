/** Schema types — mirror tabel SQLite */

export type NoteType = "markdown" | "snippet" | "command";

export interface NoteRow {
  id: string;
  title: string;
  type: NoteType;
  language: string | null;
  content: string;
  is_pinned: number; // 0 | 1
  is_archived: number; // 0 | 1
  deleted_at: number | null;
  last_export_path: string | null;
  source_path: string | null;
  created_at: number;
  updated_at: number;
}

export interface TagRow {
  id: string;
  name: string;
}

export interface NoteTagRow {
  note_id: string;
  tag_id: string;
}

export interface AppSettingRow {
  key: string;
  value: string;
}

export type ViewId = "inbox" | "pinned" | "snippets" | "archive" | "trash";

/** Filter WHERE clause untuk tiap nav view */
export const VIEW_FILTERS: Record<ViewId, string> = {
  inbox: "deleted_at IS NULL AND is_archived = 0",
  pinned: "deleted_at IS NULL AND is_archived = 0 AND is_pinned = 1",
  snippets: "deleted_at IS NULL AND is_archived = 0 AND type = 'snippet'",
  archive: "deleted_at IS NULL AND is_archived = 1",
  trash: "deleted_at IS NOT NULL",
};
