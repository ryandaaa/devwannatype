import { useMemo } from "react";
import { useNotes } from "../notes/hooks";
import { useLayoutStore } from "../layout/store";

export interface OutlineHeading {
  level: number;
  text: string;
  slug: string;
  lineIdx: number; // 0-indexed line in source
}

interface OutlinePanelProps {
  source: string;
  onJump?: (heading: OutlineHeading) => void;
}

/** Slugify untuk anchor — lowercase, alphanumeric + dash. */
export function slugifyHeading(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

/** Parse markdown headings (ATX style, `#` sampai `######`). Skip code fences.
 *  Slug di-dedup dengan suffix `-2`, `-3` saat ada duplikat — match logic
 *  yang sama di MarkdownPreview supaya outline jump ketemu element. */
export function parseHeadings(source: string): OutlineHeading[] {
  if (!source) return [];
  const lines = source.split("\n");
  const out: OutlineHeading[] = [];
  const slugCount = new Map<string, number>();
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const level = m[1].length;
      const text = m[2].replace(/\s+#+\s*$/, "").trim();
      if (text) {
        const base = slugifyHeading(text);
        const c = (slugCount.get(base) ?? 0) + 1;
        slugCount.set(base, c);
        const slug = c === 1 ? base : `${base}-${c}`;
        out.push({ level, text, slug, lineIdx: i });
      }
    }
  }
  return out;
}

export function OutlinePanel({ source, onJump }: OutlinePanelProps) {
  const headings = useMemo(() => parseHeadings(source), [source]);
  const togglePreview = useLayoutStore((s) => s.togglePreview);

  if (headings.length < 2) {
    return (
      <div className="w-[200px] border-l border-surface-container-high bg-surface-container-low flex flex-col">
        <Header onClose={togglePreview} />
        <div className="px-md py-sm font-code text-body-sm text-on-surface-variant opacity-60">
          no headings
        </div>
      </div>
    );
  }
  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <div className="w-[220px] border-l border-surface-container-high bg-surface-container-low flex flex-col shrink-0">
      <Header onClose={togglePreview} />
      <div className="flex-1 overflow-y-auto py-xs">
        {headings.map((h, idx) => (
          <button
            key={`${idx}-${h.slug}`}
            type="button"
            onClick={() => onJump?.(h)}
            className="w-full text-left font-code text-body-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors py-[3px] truncate"
            style={{ paddingLeft: `${(h.level - minLevel) * 12 + 16}px`, paddingRight: 12 }}
            title={h.text}
          >
            {h.text}
          </button>
        ))}
      </div>
      <BacklinksSection source={source} />
    </div>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-md h-[32px] border-b border-surface-container-high flex items-center justify-between">
      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
        Outline
      </span>
      <button
        type="button"
        aria-label="Close outline (Ctrl+\\)"
        title="Toggle preview (Ctrl+\\)"
        onClick={onClose}
        className="text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
          close
        </span>
      </button>
    </div>
  );
}

/** Backlinks: cari note lain yang me-link via [[title]] ke note aktif. */
function BacklinksSection({ source }: { source: string }) {
  const selectedId = useLayoutStore((s) => s.selectedNoteId);
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);
  const setActiveView = useLayoutStore((s) => s.setActiveView);
  const { data: inbox = [] } = useNotes("inbox");
  const { data: archive = [] } = useNotes("archive");
  const all = [...inbox, ...archive];
  const activeNote = all.find((n) => n.id === selectedId);
  if (!activeNote) return null;
  const title = activeNote.title.trim();
  if (!title) return null;
  const lower = title.toLowerCase();
  const linkers = all.filter((n) => {
    if (n.id === selectedId) return false;
    const matches = (n.content.match(/\[\[([^\]]+)\]\]/g) ?? [])
      .map((m) => m.slice(2, -2).trim().toLowerCase());
    return matches.includes(lower);
  });
  if (linkers.length === 0) {
    void source;
    return null;
  }
  return (
    <div className="border-t border-surface-container-high">
      <div className="px-md py-xs font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider opacity-80">
        Backlinks
      </div>
      <div className="flex flex-col pb-sm">
        {linkers.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => {
              setActiveView(n.is_archived === 1 ? "archive" : "inbox");
              setSelectedNoteId(n.id);
            }}
            className="text-left font-code text-body-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-md py-[3px] truncate"
          >
            {n.title || "Untitled"}
          </button>
        ))}
      </div>
    </div>
  );
}
