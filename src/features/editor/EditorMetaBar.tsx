import { Icon } from "../../components/Icon";
import { useUpdateNoteMeta, useUpdateNoteSourcePath } from "../notes/hooks";
import { TagEditor } from "../tags/TagEditor";
import { SUPPORTED_LANGUAGES } from "./languages";
import { detectLanguage } from "./detectLanguage";
import { useLayoutStore } from "../layout/store";
import type { NoteType } from "../../db/schema";

interface EditorMetaBarProps {
  noteId: string;
  type: NoteType;
  language: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  wordCount: number;
  lastExportPath: string | null;
  sourcePath: string | null;
  liveContent: string;
}

const TYPES: { value: NoteType; label: string; icon: string }[] = [
  { value: "markdown", label: "markdown", icon: "description" },
  { value: "snippet", label: "snippet", icon: "code" },
  { value: "command", label: "command", icon: "terminal" },
];

/**
 * Meta bar di bawah editor header — tipe note, bahasa, tag, status save, word count.
 * Visual: thin row 32px selaras header terminal.
 */
export function EditorMetaBar(props: EditorMetaBarProps) {
  const { noteId, type, language, tags, wordCount, lastExportPath, sourcePath, liveContent } = props;
  const updateMeta = useUpdateNoteMeta();
  const updateSourcePath = useUpdateNoteSourcePath();
  const saveStatus = useLayoutStore((s) => s.saveStatus);

  function onTypeChange(v: string) {
    const newType = v as NoteType;
    let nextLang = newType === "markdown" ? null : language;
    // Auto-detect kalau pindah ke snippet/command tanpa language
    if (newType !== "markdown" && !language) {
      const detected = detectLanguage(liveContent);
      if (detected) nextLang = detected;
      else if (newType === "command") nextLang = "bash";
    }
    updateMeta.mutate({ id: noteId, type: newType, language: nextLang });
  }

  return (
    <div className="px-lg h-[32px] border-b border-surface-container-high bg-surface-container-low flex items-center justify-between gap-md shrink-0">
      <div className="flex items-center gap-md min-w-0 flex-1">
        {/* Type picker */}
        <label className="flex items-center gap-xs">
          <span className="font-code text-[10px] text-on-surface-variant uppercase tracking-wider">
            type
          </span>
          <SelectChip
            value={type}
            options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
            onChange={onTypeChange}
          />
        </label>

        {/* Language picker (snippet / command) */}
        {type !== "markdown" && (
          <label className="flex items-center gap-xs">
            <span className="font-code text-[10px] text-on-surface-variant uppercase tracking-wider">
              lang
            </span>
            <SelectChip
              value={language ?? (type === "command" ? "bash" : "")}
              options={[
                { value: "", label: "none" },
                ...SUPPORTED_LANGUAGES.map((l) => ({ value: l.value, label: l.label })),
              ]}
              onChange={(v) =>
                updateMeta.mutate({ id: noteId, language: v === "" ? null : v })
              }
            />
          </label>
        )}

        {/* Separator */}
        <div className="h-4 w-px bg-surface-container-high shrink-0" />

        {/* Tag editor */}
        <TagEditor noteId={noteId} tags={tags} />
      </div>

      <div className="flex items-center gap-md shrink-0">
        {sourcePath && (
          <button
            type="button"
            title={`Linked: ${sourcePath} (click to copy, right-click to unlink)`}
            onClick={() => navigator.clipboard.writeText(sourcePath).catch(() => {})}
            onContextMenu={(e) => {
              e.preventDefault();
              updateSourcePath.mutate({ id: noteId, path: null });
            }}
            className="flex items-center gap-xs font-code text-[10px] text-on-surface hover:text-primary transition-colors max-w-[260px]"
          >
            <Icon name="link" size={12} />
            <span className="truncate">{sourcePath.split(/[\\/]/).pop() ?? sourcePath}</span>
          </button>
        )}
        <SaveStatusBadge status={saveStatus} />
        <span className="font-code text-[10px] text-on-surface-variant">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
        {lastExportPath && (
          <button
            type="button"
            title={lastExportPath}
            onClick={() => navigator.clipboard.writeText(lastExportPath).catch(() => {})}
            className="flex items-center gap-xs font-code text-[10px] text-on-surface-variant hover:text-on-surface transition-colors max-w-[260px]"
          >
            <Icon name="file_download_done" size={12} />
            <span className="truncate">{lastExportPath}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function SaveStatusBadge({ status }: { status: "saved" | "saving" | "dirty" }) {
  const label = status === "saved" ? "saved" : status === "saving" ? "saving" : "unsaved";
  const dotCls =
    status === "saving"
      ? "bg-on-surface-variant dwt-pulse"
      : status === "dirty"
        ? "bg-error"
        : "bg-on-surface-variant opacity-40";
  return (
    <span className="flex items-center gap-xs">
      <span className={`w-[6px] h-[6px] ${dotCls}`} />
      <span className="font-code text-[10px] text-on-surface-variant uppercase tracking-wider">
        {label}
      </span>
    </span>
  );
}

function SelectChip({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none px-xs py-[2px] pr-[18px] border border-surface-container-high bg-background hover:border-outline-variant focus:border-outline-variant focus:outline-none rounded-none font-code text-[10px] text-on-surface-variant cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface-container-low">
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="material-symbols-outlined absolute right-[2px] top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
        style={{ fontSize: "12px" }}
      >
        expand_more
      </span>
    </div>
  );
}
