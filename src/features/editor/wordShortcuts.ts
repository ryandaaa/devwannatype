import type { KeyBinding } from "@codemirror/view";
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrikethrough,
  insertLink,
  setHeadingLevel,
  toggleBulletList,
  toggleOrderedList,
  toggleBlockquote,
  toggleInlineCode,
} from "./markdownActions";

/**
 * Word-style keyboard shortcuts untuk markdown editor.
 * Hanya aktif saat note tipe = markdown (di-pasang via compartment dari CodeMirrorEditor).
 */
export const wordStyleKeymap: readonly KeyBinding[] = [
  { key: "Mod-b", preventDefault: true, run: toggleBold },
  { key: "Mod-i", preventDefault: true, run: toggleItalic },
  { key: "Mod-u", preventDefault: true, run: toggleUnderline },
  { key: "Mod-Shift-x", preventDefault: true, run: toggleStrikethrough },
  { key: "Mod-Shift-c", preventDefault: true, run: toggleInlineCode },
  { key: "Mod-k", preventDefault: true, run: insertLink },
  { key: "Mod-1", preventDefault: true, run: (v) => setHeadingLevel(v, 1) },
  { key: "Mod-2", preventDefault: true, run: (v) => setHeadingLevel(v, 2) },
  { key: "Mod-3", preventDefault: true, run: (v) => setHeadingLevel(v, 3) },
  { key: "Mod-4", preventDefault: true, run: (v) => setHeadingLevel(v, 4) },
  { key: "Mod-5", preventDefault: true, run: (v) => setHeadingLevel(v, 5) },
  { key: "Mod-6", preventDefault: true, run: (v) => setHeadingLevel(v, 6) },
  { key: "Mod-Shift-l", preventDefault: true, run: toggleBulletList },
  { key: "Mod-Shift-o", preventDefault: true, run: toggleOrderedList },
  { key: "Mod-Shift-.", preventDefault: true, run: toggleBlockquote },
];
