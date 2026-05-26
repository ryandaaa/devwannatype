-- Migration v2: source_path column for file-linked notes.
-- When set, Ctrl+S also writes the note content to this absolute file path
-- (in addition to the SQLite autosave). Set on import (drag-drop / open dialog
-- / OS file association) and updateable via "Link to file" UI.

ALTER TABLE notes ADD COLUMN source_path TEXT;
