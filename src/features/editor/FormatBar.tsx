import { Icon } from "../../components/Icon";
import type { CodeMirrorEditorHandle } from "./CodeMirrorEditor";
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrikethrough,
  toggleInlineCode,
  insertLink,
  setHeadingLevel,
  toggleBulletList,
  toggleOrderedList,
  toggleBlockquote,
  toggleTaskList,
  insertCodeBlock,
  insertHorizontalRule,
} from "./markdownActions";
import type { EditorView } from "@codemirror/view";

interface FormatBarProps {
  editorRef: React.RefObject<CodeMirrorEditorHandle | null>;
}

interface ToolButton {
  icon: string;
  label: string;
  shortcut?: string;
  run: (view: EditorView) => boolean;
}

const HEADING_BUTTONS: ToolButton[] = [
  { icon: "format_h1", label: "Heading 1", shortcut: "Ctrl+1", run: (v) => setHeadingLevel(v, 1) },
  { icon: "format_h2", label: "Heading 2", shortcut: "Ctrl+2", run: (v) => setHeadingLevel(v, 2) },
  { icon: "format_h3", label: "Heading 3", shortcut: "Ctrl+3", run: (v) => setHeadingLevel(v, 3) },
];

const INLINE_BUTTONS: ToolButton[] = [
  { icon: "format_bold", label: "Bold", shortcut: "Ctrl+B", run: toggleBold },
  { icon: "format_italic", label: "Italic", shortcut: "Ctrl+I", run: toggleItalic },
  { icon: "format_underlined", label: "Underline", shortcut: "Ctrl+U", run: toggleUnderline },
  {
    icon: "format_strikethrough",
    label: "Strikethrough",
    shortcut: "Ctrl+Shift+X",
    run: toggleStrikethrough,
  },
  { icon: "code", label: "Inline code", shortcut: "Ctrl+Shift+C", run: toggleInlineCode },
];

const BLOCK_BUTTONS: ToolButton[] = [
  { icon: "link", label: "Link", shortcut: "Ctrl+K", run: insertLink },
  {
    icon: "format_list_bulleted",
    label: "Bullet list",
    shortcut: "Ctrl+Shift+L",
    run: toggleBulletList,
  },
  {
    icon: "format_list_numbered",
    label: "Numbered list",
    shortcut: "Ctrl+Shift+O",
    run: toggleOrderedList,
  },
  { icon: "checklist", label: "Task list", run: toggleTaskList },
  {
    icon: "format_quote",
    label: "Blockquote",
    shortcut: "Ctrl+Shift+.",
    run: toggleBlockquote,
  },
  { icon: "data_object", label: "Code block", run: insertCodeBlock },
  { icon: "horizontal_rule", label: "Horizontal rule", run: insertHorizontalRule },
];

/**
 * Markdown format toolbar — icon-only, hanya muncul saat note tipe markdown.
 * Setiap tombol panggil action di markdownActions.ts via editorRef (CodeMirror handle).
 */
export function FormatBar({ editorRef }: FormatBarProps) {
  function run(action: ToolButton["run"]) {
    const view = editorRef.current?.getView?.();
    if (!view) return;
    action(view);
  }

  return (
    <div className="px-lg h-[32px] border-b border-surface-container-high bg-surface-container-low flex items-center gap-xs shrink-0 overflow-x-auto">
      <Group>
        {HEADING_BUTTONS.map((b) => (
          <ToolBtn key={b.icon} btn={b} onRun={run} />
        ))}
      </Group>
      <Sep />
      <Group>
        {INLINE_BUTTONS.map((b) => (
          <ToolBtn key={b.icon} btn={b} onRun={run} />
        ))}
      </Group>
      <Sep />
      <Group>
        {BLOCK_BUTTONS.map((b) => (
          <ToolBtn key={b.icon} btn={b} onRun={run} />
        ))}
      </Group>
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-[2px]">{children}</div>;
}

function Sep() {
  return <div className="h-4 w-px bg-surface-container-high mx-xs shrink-0" />;
}

function ToolBtn({
  btn,
  onRun,
}: {
  btn: ToolButton;
  onRun: (action: ToolButton["run"]) => void;
}) {
  const title = btn.shortcut ? `${btn.label} (${btn.shortcut})` : btn.label;
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onMouseDown={(e) => {
        // Cegah blur editor sebelum action di-jalankan
        e.preventDefault();
      }}
      onClick={() => onRun(btn.run)}
      className="w-[26px] h-[24px] flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors rounded-none"
    >
      <Icon name={btn.icon} size={14} />
    </button>
  );
}
