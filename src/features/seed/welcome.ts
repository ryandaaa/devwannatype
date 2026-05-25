import { getDb } from "../../db";
import { uid, now } from "../../lib/id";

const WELCOME_TITLE = "welcome to devwannatype";

const WELCOME_CONTENT = `# welcome to devwannatype

a quiet, fast, **local-first** workspace for developer notes.
no account, no cloud, no AI assistant. just write.

your notes live in a single SQLite file inside this app's data folder.
nothing leaves your machine unless you export.

## quick keys

- **Ctrl+N**  — new note
- **Ctrl+S**  — flush save (autosave runs every 400ms)
- **Ctrl+F**  — find in note
- **Ctrl+B**  — toggle sidebar (collapse to icon rail)
- **Ctrl+J**  — toggle terminal panel
- **Ctrl+\\\\** — toggle markdown preview
- **Ctrl+K**  — command palette (search notes & run commands)
- **F11**     — zen mode (editor only)
- **?**       — keyboard shortcut cheatsheet

## three note types

devwannatype has three flavors. switch with the **type** dropdown above the editor.

- **markdown** — free-form, with a split preview when you want it
- **snippet** — pick a language, get syntax highlighting and line numbers
- **command** — short shell recipes, defaults to bash

if you set a snippet without a language, the language is auto-detected from
the content.

## organize

- **pin** a note from the right-click menu — it sticks to the top of the list
- **archive** notes you want out of the main list but still around
- **trash** is soft delete — restore or delete forever from the trash view
- **tags** are cross-note. add them from the meta bar above the editor.
  click a tag chip in the list to filter by it.
- **bulk select** — Ctrl+Click to toggle, Shift+Click for range,
  then archive / trash / pin from the action bar

## search & jump

- type in the search box at the top of the note list (substring match on title and tags)
- or press **Ctrl+K** to open the command palette — fuzzy search across all
  notes, plus quick commands like "new snippet", "go to archive", and so on
- use **Recent** in the sidebar to jump back to your last few notes

## linking & outline

- write \`[[Other note title]]\` in markdown to link to another note. click in
  preview to jump.
- if a note has 2+ headings, an **outline panel** appears next to the preview
  with a clickable table of contents.
- the outline also shows **backlinks** — notes that link to this one.

## checkboxes & code blocks

in markdown preview, checkboxes (\`- [ ]\` and \`- [x]\`) are clickable —
toggling updates the source.

\`\`\`bash
# bash / sh / zsh code blocks have a "run" button in preview
# clicking sends the snippet to the local terminal panel.
echo "hello from devwannatype"
\`\`\`

## import & export

- **drag and drop** \`.md\` or \`.txt\` files anywhere into the window — they
  become new notes. you'll see a "drop … to import" hint at the bottom of
  the note list.
- click the upload icon in the top bar (or use the command palette) to pick
  files from a dialog.
- export the active note via the **export** button in the editor header. the
  file extension follows the note type (.md / .txt / .sh) or the snippet
  language (.py, .rs, .ts, .go, etc).

## images

paste an image from your clipboard (Ctrl+V) while a markdown note is active —
it gets saved into \`app_data_dir/images/\` and inserted as a markdown image
link.

## terminal

the bottom panel hosts a real local shell. it tracks the git branch of its
working directory and shows it as a chip on the right.

\`\`\`bash
git status
\`\`\`

## themes

open settings (gear icon, top right) to switch between **dark**, **light**,
**pink**, **rose-pine**, **solarized-light**, and **nord**.

## next steps

- delete this note (right-click → move to trash) when you're done reading
- press Ctrl+N to start your first real note
- happy typing.
`;

/** Seed welcome note jika DB benar-benar kosong (notes count = 0). */
export async function seedWelcomeIfEmpty(): Promise<string | null> {
  try {
    const db = await getDb();
    const rows = await db.select<Array<{ c: number }>>(
      "SELECT COUNT(*) AS c FROM notes",
    );
    const count = rows[0]?.c ?? 0;
    if (count > 0) return null;
    const id = uid();
    const ts = now();
    await db.execute(
      `INSERT INTO notes (id, title, type, language, content, is_pinned, is_archived, deleted_at, last_export_path, created_at, updated_at)
       VALUES (?, ?, 'markdown', NULL, ?, 0, 0, NULL, NULL, ?, ?)`,
      [id, WELCOME_TITLE, WELCOME_CONTENT, ts, ts],
    );
    return id;
  } catch (e) {
    console.error("[seed] welcome failed:", e);
    return null;
  }
}
