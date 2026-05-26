import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "../../components/Icon";
import { useLayoutStore } from "../layout/store";
import { useSettingsStore } from "../settings/store";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import {
  useNote,
  useNotes,
  useUpdateNoteContent,
  useUpdateNoteMeta,
  useUpdateLastExportPath,
  type NoteWithTags,
} from "../notes/hooks";
import { useCreateAndSelectNote } from "../notes/useCreateAndSelectNote";
import { CodeMirrorEditor, type CodeMirrorEditorHandle } from "./CodeMirrorEditor";
import { MarkdownPreview } from "../preview/MarkdownPreview";
import { OutlinePanel, parseHeadings } from "../preview/OutlinePanel";
import { EditorMetaBar } from "./EditorMetaBar";
import { FormatBar } from "./FormatBar";
import { exportNoteToFile } from "../importexport";
import { useImagePaste } from "../importexport/useImagePaste";
import { useSaveBus } from "./saveBus";
import { toast } from "../../components/toast/toastStore";
import { debounce } from "../../lib/debounce";
import type { NoteType } from "../../db/schema";

const TYPE_EXT: Record<NoteType, string> = {
  markdown: "md",
  snippet: "snip",
  command: "cmd",
};

export function EditorArea({ bottomPad }: { bottomPad: number }) {
  const selectedNoteId = useLayoutStore((s) => s.selectedNoteId);
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);
  const setActiveView = useLayoutStore((s) => s.setActiveView);
  const setSaveStatus = useLayoutStore((s) => s.setSaveStatus);
  const showPreview = useLayoutStore((s) => s.showPreview);
  const showOutline = useLayoutStore((s) => s.showOutline);

  const { data: note, isLoading } = useNote(selectedNoteId);
  const { data: inboxNotes = [] } = useNotes("inbox");
  const { data: archiveNotes = [] } = useNotes("archive");
  const updateContent = useUpdateNoteContent();
  const autosaveDelay = useSettingsStore((s) => s.autosaveDelay);

  const editorRef = useRef<CodeMirrorEditorHandle | null>(null);

  useImagePaste({ note, editorRef });

  const contentRef = useRef<string>("");
  const lastSavedRef = useRef<string>("");
  const [liveDoc, setLiveDoc] = useState<string>("");

  const flushRef = useRef<{ flush: () => void }>({ flush: () => {} });
  const sourcePathRef = useRef<string | null>(null);
  useEffect(() => {
    sourcePathRef.current = note?.source_path ?? null;
  }, [note?.source_path]);
  const debouncedRef = useRef<
    | (((id: string, content: string) => void) & { flush: () => void; cancel: () => void })
    | null
  >(null);

  useEffect(() => {
    if (note) {
      contentRef.current = note.content;
      lastSavedRef.current = note.content;
      setLiveDoc(note.content);
      setSaveStatus("saved");
    }
  }, [note?.id, note?.content, setSaveStatus]);

  const persist = useCallback(
    (id: string, content: string) => {
      setSaveStatus("saving");
      updateContent.mutate(
        { id, content },
        {
          onSuccess: () => {
            lastSavedRef.current = content;
            if (contentRef.current !== content) setSaveStatus("dirty");
            else setSaveStatus("saved");
          },
          onError: (err) => {
            setSaveStatus("dirty");
            toast.error("Failed to save note", String(err));
          },
        },
      );
    },
    [updateContent, setSaveStatus],
  );

  useEffect(() => {
    if (!selectedNoteId) {
      flushRef.current = { flush: () => {} };
      return;
    }
    const debounced = debounce((id: string, content: string) => {
      persist(id, content);
    }, autosaveDelay);
    flushRef.current = {
      flush: () => {
        // 1. Flush pending debounce (jika masih ada arg menunggu)
        debounced.flush();
        // 2. Kalau status masih dirty (mis. CM doc berbeda dari lastSaved),
        //    force persist isi terbaru. Cover skenario user typing lalu
        //    autosave sudah expired tapi belum match.
        if (contentRef.current !== lastSavedRef.current) {
          persist(selectedNoteId, contentRef.current);
        }
        // 3. Kalau note linked ke file di disk → tulis isi ke sana juga.
        const sp = sourcePathRef.current;
        if (sp) {
          const body = contentRef.current;
          writeTextFile(sp, body)
            .then(() => {
              toast.success("saved to file", sp);
            })
            .catch((e) => {
              console.error("[save-to-file] failed:", e);
              toast.error("Save to file failed", String(e));
            });
        }
      },
    };
    debouncedRef.current = debounced;
    return () => {
      debounced.cancel();
      if (debouncedRef.current === debounced) debouncedRef.current = null;
    };
  }, [selectedNoteId, persist, autosaveDelay]);

  const onChangeDoc = useCallback(
    (doc: string) => {
      contentRef.current = doc;
      setLiveDoc(doc);
      if (doc === lastSavedRef.current) {
        setSaveStatus("saved");
        return;
      }
      setSaveStatus("dirty");
      const fn = debouncedRef.current;
      if (fn && selectedNoteId) {
        fn(selectedNoteId, doc);
      }
    },
    [selectedNoteId, setSaveStatus],
  );

  const onSaveShortcut = useCallback(() => {
    flushRef.current.flush();
  }, []);

  // Register handler di global save bus supaya Ctrl+S dari mana pun (dengan
  // preventDefault) bisa flush save note aktif walau editor tidak focus.
  useEffect(() => {
    useSaveBus.getState().setFlushHandler(() => flushRef.current.flush());
    return () => {
      useSaveBus.getState().setFlushHandler(null);
    };
  }, [selectedNoteId]);

  // Wiki link navigation: cari note dengan title match (case-insensitive)
  const allActiveNotes = useMemo(
    () => [...inboxNotes, ...archiveNotes],
    [inboxNotes, archiveNotes],
  );
  const onWikiNavigate = useCallback(
    (title: string) => {
      const lower = title.trim().toLowerCase();
      const found = allActiveNotes.find((n) => n.title.trim().toLowerCase() === lower);
      if (found) {
        setActiveView(found.is_archived === 1 ? "archive" : "inbox");
        setSelectedNoteId(found.id);
      }
    },
    [allActiveNotes, setActiveView, setSelectedNoteId],
  );

  // Outline jump — scroll preview kalau aktif, atau scroll editor kalau editor mode
  const onOutlineJump = useCallback((h: { slug: string; lineIdx: number }) => {
    const previewActive = useLayoutStore.getState().showPreview;
    if (!previewActive) {
      editorRef.current?.scrollToLine(h.lineIdx);
      return;
    }

    function doScroll(): boolean {
      const safeSlug = CSS.escape(h.slug);
      // Bisa ada > 1 element kalau preview overlay rendering ulang. Pilih yang
      // visible (offsetParent ≠ null).
      const candidates = document.querySelectorAll<HTMLElement>(
        `[data-heading-slug="${safeSlug}"]`,
      );
      let el: HTMLElement | null = null;
      for (const c of candidates) {
        if (c.offsetParent !== null) {
          el = c;
          break;
        }
      }
      if (!el && candidates.length > 0) el = candidates[0];
      if (!el) return false;

      let parent: HTMLElement | null = el.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        const oy = style.overflowY;
        if (oy === "auto" || oy === "scroll") break;
        parent = parent.parentElement;
      }
      if (!parent) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      const elRect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const target = parent.scrollTop + (elRect.top - parentRect.top) - 16;
      parent.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
      return true;
    }

    // Coba sync dulu. Kalau element belum di DOM (deferred render), retry
    // dengan beberapa frame.
    if (doScroll()) return;
    let attempts = 0;
    function retry() {
      if (doScroll()) return;
      attempts += 1;
      if (attempts < 6) window.requestAnimationFrame(retry);
    }
    window.requestAnimationFrame(retry);
  }, []);

  // Task list toggle: cari occurrence ke-N dari pattern "- [ ]" / "- [x]" di source dan flip
  const onTaskToggle = useCallback((occurrence: number, checked: boolean) => {
    const view = editorRef.current;
    if (!view) return;
    const src = view.getDoc();
    const re = /^(\s*[-*+]\s+)\[([ xX])\]/gm;
    let count = 0;
    let m: RegExpExecArray | null;
    let pos = -1;
    while ((m = re.exec(src)) !== null) {
      if (count === occurrence) {
        // m.index points to start of line lead, [' '] mark is at m.index + m[1].length + 1
        pos = m.index + m[1].length + 1;
        break;
      }
      count++;
    }
    if (pos < 0) return;
    const next = src.slice(0, pos) + (checked ? "x" : " ") + src.slice(pos + 1);
    view.replaceDoc(next);
  }, []);

  // ALL hooks must run before any early return. Compute deferred + memo + state
  // di sini supaya hooks order konsisten.
  const isMarkdown = note?.type === "markdown";
  const showSplit = !!isMarkdown && showPreview;
  const deferredDoc = useDeferredValue(liveDoc);
  const wordCount = useMemo(
    () => countWords(deferredDoc || note?.content || ""),
    [deferredDoc, note?.content],
  );
  const hasOutline = useMemo(
    () => !!isMarkdown && parseHeadings(deferredDoc || note?.content || "").length >= 2,
    [isMarkdown, deferredDoc, note?.content],
  );
  const [previewMounted, setPreviewMounted] = useState(showSplit);
  useEffect(() => {
    if (showSplit) {
      setPreviewMounted(true);
      return;
    }
    const t = window.setTimeout(() => setPreviewMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [showSplit]);

  if (!selectedNoteId) {
    return <EmptyEditor bottomPad={bottomPad} />;
  }

  if (isLoading || !note) {
    return (
      <>
        <EditorHeader breadcrumb="loading…" liveContent="" />
        <div
          className="flex-1 overflow-y-auto p-lg lg:p-[48px]"
          style={{ paddingBottom: `${bottomPad + 32}px` }}
        >
          <div className="font-code text-body-sm text-on-surface-variant">loading…</div>
        </div>
      </>
    );
  }

  const breadcrumb = computeBreadcrumb(note.type, note.tags, note.title || "untitled");

  return (
    <>
      <EditorHeader breadcrumb={breadcrumb} note={note} liveContent={liveDoc || note.content} />
      <EditorMetaBar
        noteId={note.id}
        type={note.type}
        language={note.language}
        tags={note.tags}
        createdAt={note.created_at}
        updatedAt={note.updated_at}
        wordCount={wordCount}
        lastExportPath={note.last_export_path}
        sourcePath={note.source_path}
        liveContent={liveDoc || note.content}
      />
      {isMarkdown && !showSplit && <FormatBar editorRef={editorRef} />}
      <div
        className="flex-1 overflow-hidden flex dwt-anim-bottom relative"
        style={{ paddingBottom: `${bottomPad}px` }}
      >
        {/* Editor — selalu mounted, fade out saat preview aktif */}
        <div
          className={`absolute inset-0 flex overflow-hidden dwt-fade ${
            showSplit ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex-1 overflow-y-auto p-lg lg:p-[48px]">
            <div className="max-w-[820px] mx-auto h-full">
              <TitleInput noteId={note.id} initialTitle={note.title} />
              <CodeMirrorEditor
                ref={editorRef}
                key={note.id}
                noteId={note.id}
                initialDoc={note.content}
                type={note.type}
                language={note.language}
                onChange={onChangeDoc}
                onSaveShortcut={onSaveShortcut}
              />
            </div>
          </div>
          {/* Outline rail — juga ditampilkan di editor mode untuk markdown panjang */}
          {hasOutline && showOutline && <OutlinePanel source={deferredDoc} onJump={onOutlineJump} />}
        </div>

        {/* Preview overlay — fade in saat aktif, unmount setelah fade-out untuk
            menghindari re-render react-markdown yang berat saat user mengetik. */}
        {previewMounted && (
          <div
            className={`absolute inset-0 flex overflow-hidden dwt-fade ${
              showSplit ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex-1 overflow-hidden flex flex-col">
              <MarkdownPreview
                source={deferredDoc}
                onWikiNavigate={onWikiNavigate}
                onTaskToggle={onTaskToggle}
              />
            </div>
            {hasOutline && showOutline && <OutlinePanel source={deferredDoc} onJump={onOutlineJump} />}
          </div>
        )}
      </div>
    </>
  );
}

function computeBreadcrumb(type: NoteType, tags: string[], title: string): string {
  const segs: string[] = [type];
  if (tags.length > 0) segs.push(tags[0]);
  segs.push(`${slugify(title)}.${TYPE_EXT[type]}`);
  return segs.join(" / ");
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "untitled"
  );
}

function countWords(s: string): number {
  if (!s) return 0;
  const stripped = s.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");
  const tokens = stripped.split(/\s+/).filter(Boolean);
  return tokens.length;
}

function EditorHeader({
  breadcrumb,
  note,
  liveContent,
}: {
  breadcrumb: string;
  note?: NoteWithTags;
  liveContent: string;
}) {
  const updateExportPath = useUpdateLastExportPath();
  const showPreview = useLayoutStore((s) => s.showPreview);
  const togglePreview = useLayoutStore((s) => s.togglePreview);
  const showOutline = useLayoutStore((s) => s.showOutline);
  const toggleOutline = useLayoutStore((s) => s.toggleOutline);
  const isMarkdown = note?.type === "markdown";
  const hasOutlineNow = useMemo(
    () => isMarkdown && parseHeadings(liveContent || "").length >= 2,
    [isMarkdown, liveContent],
  );
  const [copied, setCopied] = useState(false);

  async function onExport() {
    if (!note) return;
    try {
      const path = await exportNoteToFile(note);
      if (path) {
        updateExportPath.mutate({ id: note.id, path });
        toast.success("note exported", path);
      }
    } catch (e) {
      console.error("[export] failed:", e);
      toast.error("Export failed", String(e));
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(liveContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="h-[48px] px-lg border-b border-surface-container-high flex items-center justify-between shrink-0">
      <div className="flex items-center gap-sm min-w-0">
        <Icon name="description" size={16} className="text-on-surface-variant shrink-0" />
        <span className="font-code text-body-sm text-on-surface-variant truncate">
          {breadcrumb}
        </span>
      </div>
      <div className="flex items-center gap-md shrink-0">
        {hasOutlineNow && (
          <button
            type="button"
            aria-label={showOutline ? "Hide outline" : "Show outline"}
            onClick={toggleOutline}
            className={`flex items-center gap-xs transition-colors font-code text-body-sm ${
              showOutline
                ? "text-on-surface"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Toggle outline panel"
          >
            <Icon name="format_list_bulleted" size={16} />
            <span>outline</span>
          </button>
        )}
        {isMarkdown && (
          <button
            type="button"
            aria-label={showPreview ? "Hide preview" : "Show preview"}
            onClick={togglePreview}
            className={`flex items-center gap-xs transition-colors font-code text-body-sm ${
              showPreview
                ? "text-on-surface"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Toggle preview (Ctrl+\\)"
          >
            <Icon name={showPreview ? "splitscreen" : "splitscreen_top"} size={16} />
            <span>preview</span>
          </button>
        )}
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy content"}
          title={copied ? "Copied" : "Copy content"}
          onClick={onCopy}
          disabled={!note}
          className="flex items-center gap-xs text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50 font-code text-body-sm"
        >
          <Icon name={copied ? "check" : "content_copy"} size={16} />
          <span>{copied ? "copied" : "copy"}</span>
        </button>
        <button
          type="button"
          aria-label="Export note"
          title="Export note"
          onClick={onExport}
          disabled={!note}
          className="flex items-center gap-xs text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50 font-code text-body-sm"
        >
          <Icon name="download" size={16} />
          <span>export</span>
        </button>
      </div>
    </div>
  );
}

function TitleInput({ noteId, initialTitle }: { noteId: string; initialTitle: string }) {
  const [value, setValue] = useState(initialTitle);
  const updateMeta = useUpdateNoteMeta();
  const debouncedSave = useRef(
    debounce((id: string, title: string) => {
      updateMeta.mutate({ id, title });
    }, 400),
  );

  useEffect(() => {
    setValue(initialTitle);
  }, [noteId, initialTitle]);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        debouncedSave.current(noteId, e.target.value);
      }}
      placeholder="untitled"
      className="w-full bg-transparent outline-none mb-lg font-display text-display text-on-surface tracking-tight placeholder:text-on-surface-variant placeholder:opacity-40"
    />
  );
}

function EmptyEditor({ bottomPad }: { bottomPad: number }) {
  const create = useCreateAndSelectNote();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    void create.mutateAsync().catch((e) => {
      // If create fails, allow retry on next mount
      firedRef.current = false;
      console.error("[empty] auto-create failed:", e);
    });
    // create is stable enough; we only want to fire once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="h-[48px] px-lg border-b border-surface-container-high flex items-center shrink-0">
        <span className="font-code text-body-sm text-on-surface-variant opacity-60">
          new note
        </span>
      </div>
      <div
        className="flex-1 overflow-hidden flex items-center justify-center"
        style={{ paddingBottom: `${bottomPad}px` }}
      >
        <div className="font-code text-body-sm text-on-surface-variant opacity-40">
          creating…
        </div>
      </div>
    </>
  );
}
