import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { Overlay } from "../../components/Overlay";
import { useLayoutStore } from "../layout/store";
import { useNotes } from "../notes/hooks";
import { useCreateAndSelectNote } from "../notes/useCreateAndSelectNote";
import { importMarkdownFiles } from "../importexport";
import { useCreateNote } from "../notes/hooks";
import { relativeTime } from "../../lib/date";
import type { ViewId } from "../../db/schema";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  kind: "note" | "command";
  icon: string;
  label: string;
  hint?: string;
  onSelect: () => void;
}

/**
 * Cmd+K palette — fuzzy search judul note + commands cepat.
 * No library, no animation. Substring + simple subsequence scoring.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const setActiveView = useLayoutStore((s) => s.setActiveView);
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const togglePreview = useLayoutStore((s) => s.togglePreview);
  const create = useCreateAndSelectNote();
  const createNote = useCreateNote();

  // Note dari semua aktif (Inbox) untuk dipilih cepat
  const { data: inbox = [] } = useNotes("inbox");
  const { data: archive = [] } = useNotes("archive");

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const cmds: PaletteItem[] = [
      {
        id: "cmd:new-note",
        kind: "command",
        icon: "add",
        label: "New note",
        hint: "Ctrl+N",
        onSelect: () => {
          void create.mutateAsync();
          onClose();
        },
      },
      {
        id: "cmd:new-snippet",
        kind: "command",
        icon: "code",
        label: "New snippet",
        onSelect: () => {
          void create.mutateAsync({ type: "snippet" });
          onClose();
        },
      },
      {
        id: "cmd:new-command",
        kind: "command",
        icon: "terminal",
        label: "New command",
        onSelect: () => {
          void create.mutateAsync({ type: "command" });
          onClose();
        },
      },
      {
        id: "cmd:import-md",
        kind: "command",
        icon: "upload_file",
        label: "Import .md files",
        onSelect: async () => {
          onClose();
          const files = await importMarkdownFiles();
          let lastId = "";
          for (const item of files) {
            const note = await createNote.mutateAsync({
              type: "markdown",
              title: item.title,
              content: item.content,
              sourcePath: item.sourcePath,
            });
            lastId = note.id;
          }
          if (lastId) {
            setActiveView("inbox");
            setSelectedNoteId(lastId);
          }
        },
      },
      {
        id: "cmd:toggle-sidebar",
        kind: "command",
        icon: "menu",
        label: "Toggle sidebar",
        hint: "Ctrl+B",
        onSelect: () => {
          toggleSidebar();
          onClose();
        },
      },
      {
        id: "cmd:toggle-preview",
        kind: "command",
        icon: "splitscreen",
        label: "Toggle markdown preview",
        hint: "Ctrl+\\",
        onSelect: () => {
          togglePreview();
          onClose();
        },
      },
      ...(["inbox", "pinned", "snippets", "archive", "trash"] as ViewId[]).map(
        (v): PaletteItem => ({
          id: `cmd:view-${v}`,
          kind: "command",
          icon:
            v === "inbox"
              ? "description"
              : v === "pinned"
                ? "push_pin"
                : v === "snippets"
                  ? "code"
                  : v === "archive"
                    ? "archive"
                    : "delete",
          label: `Go to ${v === "inbox" ? "notes" : v}`,
          onSelect: () => {
            setActiveView(v);
            onClose();
          },
        }),
      ),
    ];

    const allNotes = [...inbox, ...archive];
    const noteItems: PaletteItem[] = allNotes.map((n) => ({
      id: `note:${n.id}`,
      kind: "note",
      icon:
        n.type === "snippet"
          ? "code"
          : n.type === "command"
            ? "terminal"
            : "description",
      label: n.title || "Untitled",
      hint: relativeTime(n.updated_at),
      onSelect: () => {
        setSelectedNoteId(n.id);
        if (n.is_archived === 1) setActiveView("archive");
        else setActiveView("inbox");
        onClose();
      },
    }));

    if (!query.trim()) {
      return [...cmds, ...noteItems].slice(0, 50);
    }

    const q = query.trim().toLowerCase();
    const scored = [...cmds, ...noteItems]
      .map((it) => ({ it, score: fuzzyScore(it.label.toLowerCase(), q) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 30)
      .map((x) => x.it);
    return scored;
  }, [
    query,
    inbox,
    archive,
    create,
    createNote,
    setActiveView,
    setSelectedNoteId,
    toggleSidebar,
    togglePreview,
    onClose,
  ]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  return (
    <Overlay
      open={open}
      onBackdropClick={onClose}
      position="top"
      topOffset="15vh"
      ariaLabel="Command palette"
    >
      <div className="w-[560px] max-w-[90vw] bg-surface-container-low border border-surface-container-high">
        <div className="flex items-center gap-sm px-md h-[44px] border-b border-surface-container-high">
          <Icon name="search" size={16} className="text-on-surface-variant" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="search notes & commands"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(items.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                items[active]?.onSelect();
              }
            }}
            className="flex-1 bg-transparent outline-none font-code text-body-md text-on-surface placeholder:text-on-surface-variant placeholder:opacity-60"
          />
          <kbd className="font-code text-[10px] text-on-surface-variant border border-surface-container-high px-xs py-[1px]">
            esc
          </kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto py-xs">
          {items.length === 0 && (
            <div className="px-md py-md font-code text-body-sm text-on-surface-variant opacity-70">
              no match
            </div>
          )}
          {items.map((it, idx) => (
            <button
              key={it.id}
              type="button"
              onClick={() => it.onSelect()}
              onMouseEnter={() => setActive(idx)}
              className={`w-full flex items-center gap-sm px-md py-xs font-code text-body-sm text-left ${
                idx === active
                  ? "bg-surface-container-high text-on-surface"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <Icon name={it.icon} size={14} />
              <span className="flex-1 truncate">{it.label}</span>
              {it.hint && (
                <span className="font-code text-[10px] text-on-surface-variant opacity-70 shrink-0">
                  {it.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

/** Subsequence fuzzy score — lower is better; -1 if no match. */
function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 0;
  if (haystack.startsWith(needle)) return 0;
  if (haystack.includes(needle)) return 1;
  // Subsequence match
  let i = 0;
  let lastIdx = -1;
  let score = 2;
  for (const c of needle) {
    const idx = haystack.indexOf(c, lastIdx + 1);
    if (idx < 0) return -1;
    score += idx - lastIdx;
    lastIdx = idx;
    i++;
  }
  return score + (haystack.length - i) * 0.05;
}
