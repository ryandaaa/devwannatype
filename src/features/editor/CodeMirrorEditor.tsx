import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { cmDarkTheme } from "./theme";
import { cmHighlightExt } from "./highlight";
import { languageExtension } from "./languages";
import { wordStyleKeymap } from "./wordShortcuts";
import type { NoteType } from "../../db/schema";

export interface CodeMirrorEditorHandle {
  /** Replace seluruh dokumen dengan string baru. Akan trigger onChange. */
  replaceDoc: (next: string) => void;
  /** Append string ke akhir dokumen. */
  appendDoc: (chunk: string) => void;
  getDoc: () => string;
  /** Scroll editor ke line tertentu (0-indexed) dan letakkan cursor di sana. */
  scrollToLine: (lineIdx: number) => void;
  /** Akses langsung ke EditorView (untuk action eksternal seperti FormatBar). */
  getView: () => EditorView | null;
}

interface CodeMirrorEditorProps {
  noteId: string;
  initialDoc: string;
  type: NoteType;
  language: string | null;
  onChange: (doc: string) => void;
  onSaveShortcut: () => void;
}

/**
 * CodeMirror 6 editor — re-mount fresh saat noteId berubah supaya
 * state lama tidak nyangkut. Saat type/language berubah, swap extension lewat compartment.
 * Ref API menyediakan replaceDoc / appendDoc untuk integrasi external (preview checkbox).
 */
export const CodeMirrorEditor = forwardRef<CodeMirrorEditorHandle, CodeMirrorEditorProps>(
  function CodeMirrorEditorImpl(
    { noteId, initialDoc, type, language, onChange, onSaveShortcut },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const onSaveRef = useRef(onSaveShortcut);
    const langCompartment = useRef(new Compartment());
    const lineNumCompartment = useRef(new Compartment());

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);
    useEffect(() => {
      onSaveRef.current = onSaveShortcut;
    }, [onSaveShortcut]);

    useImperativeHandle(
      ref,
      () => ({
        replaceDoc: (next: string) => {
          const v = viewRef.current;
          if (!v) return;
          v.dispatch({
            changes: { from: 0, to: v.state.doc.length, insert: next },
          });
        },
        appendDoc: (chunk: string) => {
          const v = viewRef.current;
          if (!v) return;
          v.dispatch({
            changes: { from: v.state.doc.length, insert: chunk },
          });
        },
        getDoc: () => viewRef.current?.state.doc.toString() ?? "",
        getView: () => viewRef.current,
        scrollToLine: (lineIdx: number) => {
          const v = viewRef.current;
          if (!v) return;
          const total = v.state.doc.lines;
          const safe = Math.min(Math.max(1, lineIdx + 1), total); // CM line is 1-indexed
          const line = v.state.doc.line(safe);
          v.dispatch({
            selection: { anchor: line.from },
            effects: EditorView.scrollIntoView(line.from, { y: "start" }),
          });
          v.focus();
        },
      }),
      [],
    );

    useEffect(() => {
      if (!containerRef.current) return;

      const langExt = buildLanguageExtension(type, language);
      const showLines = type !== "markdown";
      const mdKeymap = type === "markdown" ? wordStyleKeymap : [];

      const view = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          extensions: [
            history(),
            bracketMatching(),
            closeBrackets(),
            indentOnInput(),
            autocompletion(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            EditorView.lineWrapping,
            keymap.of([
              {
                key: "Mod-s",
                preventDefault: true,
                run: () => {
                  onSaveRef.current();
                  return true;
                },
              },
              ...mdKeymap,
              ...closeBracketsKeymap,
              ...defaultKeymap,
              ...historyKeymap,
              ...searchKeymap,
            ]),
            cmDarkTheme,
            cmHighlightExt,
            lineNumCompartment.current.of(showLines ? lineNumbers() : []),
            langCompartment.current.of(langExt),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                onChangeRef.current(update.state.doc.toString());
              }
            }),
          ],
        }),
        parent: containerRef.current,
      });
      viewRef.current = view;
      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: [
          langCompartment.current.reconfigure(buildLanguageExtension(type, language)),
          lineNumCompartment.current.reconfigure(type !== "markdown" ? lineNumbers() : []),
        ],
      });
    }, [type, language]);

    return (
      <div
        ref={containerRef}
        className="cm-host w-full h-full overflow-hidden"
        style={{ minHeight: 0 }}
      />
    );
  },
);

function buildLanguageExtension(type: NoteType, language: string | null) {
  if (type === "markdown") {
    const ext = languageExtension("markdown");
    return ext ?? [];
  }
  if (type === "command") {
    const ext = languageExtension(language ?? "bash");
    return ext ?? [];
  }
  const ext = languageExtension(language);
  return ext ?? [];
}
