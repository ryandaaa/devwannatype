import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Icon } from "../../components/Icon";
import { ContextMenu, type ContextMenuState } from "../../components/ContextMenu";
import { confirmDialog } from "../../components/confirm/confirmStore";
import { toast } from "../../components/toast/toastStore";
import { useLayoutStore } from "../layout/store";
import {
  useNotes,
  useTogglePin,
  useToggleArchive,
  useSoftDelete,
  useRestoreFromTrash,
  usePermanentDelete,
  useBulkTogglePin,
  useBulkToggleArchive,
  useBulkSoftDelete,
  useBulkRestore,
  useBulkPermanentDelete,
  type NoteWithTags,
} from "./hooks";
import { useCreateAndSelectNote } from "./useCreateAndSelectNote";
import { relativeTime } from "../../lib/date";
import { isMod } from "../../lib/debounce";
import type { ViewId } from "../../db/schema";

const VIEW_LABELS: Record<string, string> = {
  inbox: "Notes",
  pinned: "Pinned",
  snippets: "Snippets",
  archive: "Archive",
  trash: "Trash",
};

export function NoteList({ width }: { width: number }) {
  const activeView = useLayoutStore((s) => s.activeView);
  const selectedNoteId = useLayoutStore((s) => s.selectedNoteId);
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);

  const { data: notes = [], isLoading } = useNotes(activeView);

  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [bulk, setBulk] = useState<Set<string>>(new Set());
  const lastClickIdRef = useRef<string | null>(null);

  const togglePin = useTogglePin();
  const toggleArchive = useToggleArchive();
  const softDelete = useSoftDelete();
  const restore = useRestoreFromTrash();
  const permDelete = usePermanentDelete();
  const bulkPinM = useBulkTogglePin();
  const bulkArchiveM = useBulkToggleArchive();
  const bulkTrashM = useBulkSoftDelete();
  const bulkRestoreM = useBulkRestore();
  const bulkPermDeleteM = useBulkPermanentDelete();

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (n.title.toLowerCase().includes(q)) return true;
      for (const tag of n.tags) if (tag.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [notes, search]);

  // Reset bulk saat ganti view
  useEffect(() => {
    setBulk(new Set());
    lastClickIdRef.current = null;
  }, [activeView]);

  // Bulk filtered (hanya note yang masih ada di filtered list)
  const validBulk = useMemo(() => {
    if (bulk.size === 0) return bulk;
    const ids = new Set(filtered.map((n) => n.id));
    const next = new Set<string>();
    for (const id of bulk) if (ids.has(id)) next.add(id);
    return next;
  }, [bulk, filtered]);

  // Keyboard nav + bulk actions
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (validBulk.size > 0) {
          e.preventDefault();
          setBulk(new Set());
          return;
        }
      }
      if (filtered.length === 0) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
      const idx = filtered.findIndex((n) => n.id === selectedNoteId);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = idx < 0 ? 0 : Math.min(filtered.length - 1, idx + 1);
        setSelectedNoteId(filtered[next].id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = idx <= 0 ? 0 : idx - 1;
        setSelectedNoteId(filtered[next].id);
      }
    }
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [filtered, selectedNoteId, setSelectedNoteId, validBulk]);

  function onItemClick(e: ReactMouseEvent, note: NoteWithTags, index: number) {
    if (e.shiftKey && lastClickIdRef.current) {
      // Range select
      const lastIdx = filtered.findIndex((n) => n.id === lastClickIdRef.current);
      if (lastIdx >= 0) {
        const [from, to] = lastIdx < index ? [lastIdx, index] : [index, lastIdx];
        const next = new Set(validBulk);
        for (let i = from; i <= to; i++) next.add(filtered[i].id);
        setBulk(next);
        return;
      }
    }
    if (isMod(e.nativeEvent)) {
      // Toggle in bulk
      const next = new Set(validBulk);
      if (next.has(note.id)) next.delete(note.id);
      else next.add(note.id);
      setBulk(next);
      lastClickIdRef.current = note.id;
      return;
    }
    // Plain click — select to editor + clear bulk
    if (validBulk.size > 0) setBulk(new Set());
    setSelectedNoteId(note.id);
    lastClickIdRef.current = note.id;
  }

  function openMenu(ev: ReactMouseEvent, note: NoteWithTags) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!validBulk.has(note.id)) {
      setSelectedNoteId(note.id);
    }
    const inTrash = activeView === "trash";
    if (inTrash) {
      setMenu({
        x: ev.clientX,
        y: ev.clientY,
        items: [
          { label: "Restore", icon: "restore", onClick: () => restore.mutate(note.id) },
          { separator: true, label: "" },
          {
            label: "Delete forever",
            icon: "delete_forever",
            danger: true,
            onClick: async () => {
              const ok = await confirmDialog({
                title: "Delete forever",
                message: `Permanently delete "${note.title || "Untitled"}"?`,
                detail: "This cannot be undone.",
                confirmLabel: "delete forever",
                danger: true,
              });
              if (!ok) return;
              if (selectedNoteId === note.id) setSelectedNoteId(null);
              try {
                await permDelete.mutateAsync(note.id);
                toast.success("note deleted");
              } catch (e) {
                toast.error("Failed to delete", String(e));
              }
            },
          },
        ],
      });
      return;
    }
    setMenu({
      x: ev.clientX,
      y: ev.clientY,
      items: [
        {
          label: note.is_pinned === 1 ? "Unpin" : "Pin",
          icon: "push_pin",
          onClick: () => togglePin.mutate(note.id),
        },
        {
          label: note.is_archived === 1 ? "Unarchive" : "Archive",
          icon: "archive",
          onClick: () => toggleArchive.mutate(note.id),
        },
        { separator: true, label: "" },
        {
          label: "Move to Trash",
          icon: "delete",
          danger: true,
          onClick: () => {
            if (selectedNoteId === note.id) setSelectedNoteId(null);
            softDelete.mutate(note.id);
          },
        },
      ],
    });
  }

  // Bulk actions
  function selectAll() {
    setBulk(new Set(filtered.map((n) => n.id)));
  }
  function clearBulk() {
    setBulk(new Set());
  }
  async function bulkArchive() {
    const ids = Array.from(validBulk);
    await bulkArchiveM.mutateAsync(ids);
    clearBulk();
  }
  async function bulkPin() {
    const ids = Array.from(validBulk);
    await bulkPinM.mutateAsync(ids);
    clearBulk();
  }
  async function bulkTrash() {
    const ids = Array.from(validBulk);
    const ok = await confirmDialog({
      title: "Move to trash",
      message: `Move ${ids.length} ${ids.length === 1 ? "note" : "notes"} to trash?`,
      detail: "You can restore them from the Trash view.",
      confirmLabel: "move to trash",
      danger: true,
    });
    if (!ok) return;
    try {
      await bulkTrashM.mutateAsync(ids);
      if (selectedNoteId && validBulk.has(selectedNoteId)) setSelectedNoteId(null);
      clearBulk();
      toast.success(`${ids.length} ${ids.length === 1 ? "note" : "notes"} moved to trash`);
    } catch (e) {
      toast.error("Failed to move to trash", String(e));
    }
  }
  async function bulkRestore() {
    const ids = Array.from(validBulk);
    try {
      await bulkRestoreM.mutateAsync(ids);
      clearBulk();
      toast.success(`${ids.length} ${ids.length === 1 ? "note" : "notes"} restored`);
    } catch (e) {
      toast.error("Failed to restore", String(e));
    }
  }
  async function bulkPermDelete() {
    const ids = Array.from(validBulk);
    const ok = await confirmDialog({
      title: "Delete forever",
      message: `Permanently delete ${ids.length} ${ids.length === 1 ? "note" : "notes"}?`,
      detail: "This cannot be undone. The notes and their tags will be removed from the database.",
      confirmLabel: "delete forever",
      danger: true,
    });
    if (!ok) return;
    try {
      await bulkPermDeleteM.mutateAsync(ids);
      if (selectedNoteId && validBulk.has(selectedNoteId)) setSelectedNoteId(null);
      clearBulk();
      toast.success(`${ids.length} ${ids.length === 1 ? "note" : "notes"} deleted`);
    } catch (e) {
      toast.error("Failed to delete", String(e));
    }
  }

  return (
    <section
      className="bg-background border-r border-surface-container-high flex flex-col shrink-0 relative"
      style={{ width: `${width}px` }}
    >
      <div className="px-md py-sm border-b border-surface-container-high flex items-center justify-between">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
          {VIEW_LABELS[activeView] ?? "Notes"}
        </span>
        <button
          type="button"
          aria-label="Filter"
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <Icon name="filter_list" size={16} />
        </button>
      </div>

      <div className="px-md py-sm border-b border-surface-container-high">
        <div className="flex items-center gap-sm px-sm py-xs border border-surface-container-high bg-surface-container-low focus-within:border-outline-variant transition-colors">
          <Icon name="search" size={14} className="text-on-surface-variant shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search"
            className="flex-1 bg-transparent outline-none font-code text-body-sm text-on-surface placeholder:text-on-surface-variant placeholder:opacity-60"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      {validBulk.size > 0 && (
        <BulkBar
          count={validBulk.size}
          allSelected={validBulk.size === filtered.length && filtered.length > 0}
          inTrash={activeView === "trash"}
          onSelectAll={selectAll}
          onClear={clearBulk}
          onPin={bulkPin}
          onArchive={bulkArchive}
          onTrash={bulkTrash}
          onRestore={bulkRestore}
          onPermDelete={bulkPermDelete}
        />
      )}

      <div ref={listRef} tabIndex={0} className="flex-1 overflow-y-auto outline-none">
        {isLoading && (
          <div className="px-md py-lg font-code text-body-sm text-on-surface-variant">
            loading…
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <EmptyState view={activeView} hasSearch={!!search.trim()} />
        )}
        {!isLoading &&
          filtered.map((note, index) => (
            <NoteListItem
              key={note.id}
              note={note}
              selected={note.id === selectedNoteId && validBulk.size === 0}
              bulkSelected={validBulk.has(note.id)}
              onClick={(e) => onItemClick(e, note, index)}
              onContextMenu={(e) => openMenu(e, note)}
            />
          ))}
      </div>

      {/* Footer hint — drag & drop discoverability */}
      <div className="px-md py-xs border-t border-surface-container-high flex items-center gap-xs">
        <Icon name="file_upload" size={12} className="text-on-surface-variant opacity-60" />
        <span className="font-code text-[10px] text-on-surface-variant opacity-60">
          drop .md / .txt files here to import
        </span>
      </div>

      <ContextMenu state={menu} onClose={() => setMenu(null)} />
    </section>
  );
}

function BulkBar({
  count,
  allSelected,
  inTrash,
  onSelectAll,
  onClear,
  onPin,
  onArchive,
  onTrash,
  onRestore,
  onPermDelete,
}: {
  count: number;
  allSelected: boolean;
  inTrash: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onPin: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onPermDelete: () => void;
}) {
  return (
    <div className="px-md py-xs border-b border-surface-container-high bg-surface-container-low flex items-center justify-between gap-sm">
      <div className="flex items-center gap-sm">
        <span className="font-code text-[11px] text-on-surface uppercase tracking-wider">
          {count} selected
        </span>
        {!allSelected && (
          <button
            type="button"
            onClick={onSelectAll}
            className="font-code text-[10px] text-on-surface-variant hover:text-on-surface transition-colors"
          >
            select all
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="font-code text-[10px] text-on-surface-variant hover:text-on-surface transition-colors"
        >
          clear
        </button>
      </div>
      <div className="flex items-center gap-xs">
        {inTrash ? (
          <>
            <BulkAction icon="restore" label="Restore" onClick={onRestore} />
            <BulkAction icon="delete_forever" label="Delete forever" danger onClick={onPermDelete} />
          </>
        ) : (
          <>
            <BulkAction icon="push_pin" label="Pin / unpin" onClick={onPin} />
            <BulkAction icon="archive" label="Archive / unarchive" onClick={onArchive} />
            <BulkAction icon="delete" label="Move to trash" danger onClick={onTrash} />
          </>
        )}
      </div>
    </div>
  );
}

function BulkAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-[24px] h-[24px] flex items-center justify-center transition-colors ${
        danger
          ? "text-on-surface-variant hover:text-error"
          : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

function EmptyState({ view, hasSearch }: { view: ViewId; hasSearch: boolean }) {
  let label = "no notes";
  if (hasSearch) label = "no match";
  else if (view === "trash") label = "trash empty";
  else if (view === "archive") label = "archive empty";
  else if (view === "pinned") label = "no pinned notes";
  else if (view === "snippets") label = "no snippets";

  // Action CTA hanya untuk Inbox/Snippets/Pinned (tidak untuk trash/archive/no-match)
  const showCta =
    !hasSearch && (view === "inbox" || view === "snippets" || view === "pinned");

  return (
    <div className="px-md py-lg flex flex-col items-start gap-md">
      <span className="font-code text-body-sm text-on-surface-variant opacity-70">
        {label}
      </span>
      {showCta && <EmptyCta view={view} />}
    </div>
  );
}

function EmptyCta({ view }: { view: ViewId }) {
  const create = useCreateAndSelectNote();
  const label =
    view === "snippets" ? "+ create snippet" : view === "pinned" ? "+ create note" : "+ create note";
  const type = view === "snippets" ? "snippet" : "markdown";
  return (
    <button
      type="button"
      onClick={() => void create.mutateAsync({ type })}
      className="font-code text-body-sm text-on-surface-variant hover:text-on-surface border border-surface-container-high hover:border-outline-variant px-sm py-xs transition-colors"
    >
      {label}
    </button>
  );
}

function NoteListItem({
  note,
  selected,
  bulkSelected,
  onClick,
  onContextMenu,
}: {
  note: NoteWithTags;
  selected: boolean;
  bulkSelected: boolean;
  onClick: (e: ReactMouseEvent) => void;
  onContextMenu: (e: ReactMouseEvent) => void;
}) {
  const title = note.title || "Untitled";
  const preview = previewFromContent(note.content);
  const time = relativeTime(note.updated_at);
  const tags = note.tags.slice(0, 3);
  const moreTags = note.tags.length - tags.length;

  let cls =
    "px-md py-sm border-b border-surface-container-high cursor-pointer transition-colors";
  if (bulkSelected) {
    cls += " bg-surface-container-high border-l-2 border-l-primary";
  } else if (selected) {
    cls += " bg-surface-container-low border-l-2 border-l-outline-variant";
  } else {
    cls += " hover:bg-surface-container-low group";
  }

  return (
    <div onClick={onClick} onContextMenu={onContextMenu} className={cls}>
      <div className="flex justify-between items-start mb-xs gap-sm">
        <div className="flex items-center gap-xs min-w-0 flex-1">
          {note.is_pinned === 1 && (
            <Icon name="push_pin" size={11} className="text-on-surface-variant shrink-0" />
          )}
          <span
            className={`font-code text-body-sm truncate ${
              selected || bulkSelected ? "text-primary font-medium" : "text-on-surface"
            }`}
          >
            {title}
          </span>
        </div>
        <span className="font-code text-[10px] text-on-surface-variant shrink-0 mt-[2px]">
          {time}
        </span>
      </div>
      {preview && (
        <div className="font-code text-[11px] text-on-surface-variant truncate opacity-70">
          {preview}
        </div>
      )}
      {(tags.length > 0 || moreTags > 0) && (
        <div className="mt-sm flex gap-xs flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-xs py-[2px] border border-surface-container-high rounded-none font-code text-[9px] text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
          {moreTags > 0 && (
            <span className="inline-flex items-center px-xs py-[2px] font-code text-[9px] text-on-surface-variant opacity-70">
              +{moreTags}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function previewFromContent(content: string): string {
  if (!content) return "";
  const line = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.replace(/^#+\s*/, "").trim();
}
