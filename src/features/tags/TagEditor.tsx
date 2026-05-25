import { useState } from "react";
import { Icon } from "../../components/Icon";
import { useAddTagToNote, useRemoveTagFromNote } from "../notes/hooks";

interface TagEditorProps {
  noteId: string;
  tags: string[];
}

/**
 * Tag editor — chip dengan tombol "x" + input "+ tag" Enter to add.
 * Tag baru auto-create di DB.
 */
export function TagEditor({ noteId, tags }: TagEditorProps) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const addTag = useAddTagToNote();
  const removeTag = useRemoveTagFromNote();

  function commit() {
    const v = draft.trim().toLowerCase();
    if (!v) {
      setDraft("");
      setEditing(false);
      return;
    }
    if (!tags.includes(v)) {
      addTag.mutate({ noteId, name: v });
    }
    setDraft("");
  }

  return (
    <div className="flex items-center gap-xs flex-wrap">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-xs px-xs py-[2px] border border-surface-container-high rounded-none font-code text-[10px] text-on-surface-variant group"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() => removeTag.mutate({ noteId, name: tag })}
            className="opacity-60 hover:opacity-100 hover:text-on-surface transition-opacity"
          >
            <Icon name="close" size={10} />
          </button>
        </span>
      ))}
      {editing ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              if (!draft.trim()) setEditing(false);
            } else if (e.key === "Escape") {
              setDraft("");
              setEditing(false);
            }
          }}
          onBlur={() => {
            commit();
            setEditing(false);
          }}
          placeholder="tag"
          className="px-xs py-[2px] bg-surface-container-low border border-surface-container-high outline-none focus:border-outline-variant font-code text-[10px] text-on-surface placeholder:text-on-surface-variant placeholder:opacity-60 w-[80px]"
        />
      ) : (
        <button
          type="button"
          aria-label="Add tag"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-xs px-xs py-[2px] border border-surface-container-high border-dashed font-code text-[10px] text-on-surface-variant hover:border-outline-variant hover:text-on-surface transition-colors"
        >
          <Icon name="add" size={10} />
          <span>tag</span>
        </button>
      )}
    </div>
  );
}
