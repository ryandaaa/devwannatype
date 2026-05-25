import { EditorView } from "@codemirror/view";
import { EditorSelection, type ChangeSpec } from "@codemirror/state";

/**
 * Markdown action functions — pure, take an EditorView, return boolean.
 * Re-used oleh keymap (wordShortcuts.ts) dan toolbar (FormatBar.tsx).
 */

export function wrapInline(
  view: EditorView,
  marker: string,
  placeholder = "text",
): boolean {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    if (range.empty) {
      const insert = `${marker}${placeholder}${marker}`;
      return {
        changes: { from: range.from, insert },
        range: EditorSelection.range(
          range.from + marker.length,
          range.from + marker.length + placeholder.length,
        ),
      };
    }
    const text = state.sliceDoc(range.from, range.to);
    return {
      changes: { from: range.from, to: range.to, insert: marker + text + marker },
      range: EditorSelection.range(
        range.from + marker.length,
        range.to + marker.length,
      ),
    };
  });
  view.dispatch(tr);
  view.focus();
  return true;
}

export function wrapHtml(
  view: EditorView,
  openTag: string,
  closeTag: string,
): boolean {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    if (range.empty) {
      const placeholder = "text";
      const insert = `${openTag}${placeholder}${closeTag}`;
      return {
        changes: { from: range.from, insert },
        range: EditorSelection.range(
          range.from + openTag.length,
          range.from + openTag.length + placeholder.length,
        ),
      };
    }
    const text = state.sliceDoc(range.from, range.to);
    return {
      changes: { from: range.from, to: range.to, insert: openTag + text + closeTag },
      range: EditorSelection.range(
        range.from + openTag.length,
        range.to + openTag.length,
      ),
    };
  });
  view.dispatch(tr);
  view.focus();
  return true;
}

export function setHeadingLevel(view: EditorView, level: number): boolean {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    const startLine = state.doc.lineAt(range.from);
    const endLine = state.doc.lineAt(range.to);
    let fromOffset = 0;
    let toOffset = 0;
    const changes: ChangeSpec[] = [];
    for (let n = startLine.number; n <= endLine.number; n++) {
      const line = state.doc.line(n);
      const existing = /^(#{1,6})\s/.exec(line.text);
      const cleaned = line.text.replace(/^#{1,6}\s*/, "");
      const sameLevel = existing && existing[1].length === level;
      const newText = sameLevel ? cleaned : "#".repeat(level) + " " + cleaned;
      const delta = newText.length - line.text.length;
      if (n === startLine.number) fromOffset += delta;
      toOffset += delta;
      changes.push({ from: line.from, to: line.to, insert: newText });
    }
    return {
      changes,
      range: EditorSelection.range(
        Math.max(startLine.from, range.from + (range.from === startLine.from ? 0 : fromOffset)),
        range.to + toOffset,
      ),
    };
  });
  view.dispatch(tr);
  view.focus();
  return true;
}

export function toggleLinePrefix(
  view: EditorView,
  regex: RegExp,
  prefix: string,
): boolean {
  const { state } = view;
  const changes: ChangeSpec[] = [];
  const seenLines = new Set<number>();
  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number;
    const endLine = state.doc.lineAt(range.to).number;
    for (let n = startLine; n <= endLine; n++) {
      if (seenLines.has(n)) continue;
      seenLines.add(n);
      const line = state.doc.line(n);
      if (regex.test(line.text)) {
        const newText = line.text.replace(regex, "");
        changes.push({ from: line.from, to: line.to, insert: newText });
      } else {
        changes.push({ from: line.from, insert: prefix });
      }
    }
  }
  if (changes.length === 0) return false;
  view.dispatch({ changes });
  view.focus();
  return true;
}

export function toggleBulletList(view: EditorView): boolean {
  return toggleLinePrefix(view, /^\s*[-*+]\s/, "- ");
}

export function toggleOrderedList(view: EditorView): boolean {
  const { state } = view;
  const changes: ChangeSpec[] = [];
  const seenLines = new Set<number>();
  let counter = 1;
  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number;
    const endLine = state.doc.lineAt(range.to).number;
    counter = 1;
    for (let n = startLine; n <= endLine; n++) {
      if (seenLines.has(n)) continue;
      seenLines.add(n);
      const line = state.doc.line(n);
      if (/^\s*\d+\.\s/.test(line.text)) {
        const newText = line.text.replace(/^(\s*)\d+\.\s/, "$1");
        changes.push({ from: line.from, to: line.to, insert: newText });
      } else {
        changes.push({ from: line.from, insert: `${counter}. ` });
        counter++;
      }
    }
  }
  if (changes.length === 0) return false;
  view.dispatch({ changes });
  view.focus();
  return true;
}

export function toggleBlockquote(view: EditorView): boolean {
  return toggleLinePrefix(view, /^\s*>\s?/, "> ");
}

export function toggleTaskList(view: EditorView): boolean {
  return toggleLinePrefix(view, /^\s*[-*+]\s\[[ xX]\]\s/, "- [ ] ");
}

export function insertLink(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  if (range.empty) {
    const insert = "[text](url)";
    view.dispatch({
      changes: { from: range.from, insert },
      selection: EditorSelection.range(range.from + 1, range.from + 5),
    });
  } else {
    const text = state.sliceDoc(range.from, range.to);
    const insert = `[${text}](url)`;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert },
      selection: EditorSelection.range(
        range.from + text.length + 3,
        range.from + text.length + 6,
      ),
    });
  }
  view.focus();
  return true;
}

export function insertCodeBlock(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  const placeholder = "code";
  if (range.empty) {
    const insert = `\n\`\`\`\n${placeholder}\n\`\`\`\n`;
    view.dispatch({
      changes: { from: range.from, insert },
      selection: EditorSelection.range(
        range.from + 5,
        range.from + 5 + placeholder.length,
      ),
    });
  } else {
    const text = state.sliceDoc(range.from, range.to);
    const insert = `\n\`\`\`\n${text}\n\`\`\`\n`;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert },
      selection: EditorSelection.range(
        range.from + 5,
        range.from + 5 + text.length,
      ),
    });
  }
  view.focus();
  return true;
}

export function insertHorizontalRule(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  const insert = "\n---\n";
  view.dispatch({
    changes: { from: range.from, insert },
    selection: EditorSelection.cursor(range.from + insert.length),
  });
  view.focus();
  return true;
}

// Toggle convenience wrappers — used by both keymap and toolbar
export const toggleBold = (v: EditorView) => wrapInline(v, "**", "bold");
export const toggleItalic = (v: EditorView) => wrapInline(v, "*", "italic");
export const toggleUnderline = (v: EditorView) => wrapHtml(v, "<u>", "</u>");
export const toggleStrikethrough = (v: EditorView) =>
  wrapInline(v, "~~", "strikethrough");
export const toggleInlineCode = (v: EditorView) => wrapInline(v, "`", "code");
