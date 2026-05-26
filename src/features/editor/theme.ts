import { EditorView } from "@codemirror/view";

const v = (name: string) => `rgb(var(--c-${name}))`;

/** Tema CodeMirror reading from CSS variables — auto-switch dark/light. */
export const cmDarkTheme = EditorView.theme(
  {
    "&": {
      color: v("on-surface"),
      backgroundColor: "transparent",
      height: "100%",
    },
    ".cm-scroller": {
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: "var(--cm-font-size, 13px)",
      lineHeight: "1.55",
      letterSpacing: "0.01em",
    },
    ".cm-content": {
      caretColor: v("on-surface"),
      padding: "0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: v("on-surface"),
      borderLeftWidth: "1px",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: v("on-surface"),
    },
    "&.cm-focused .cm-selectionBackground, ::selection, .cm-selectionBackground": {
      backgroundColor: v("surface-variant"),
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: v("outline"),
      border: "none",
      borderRight: `1px solid ${v("surface-container-high")}`,
      paddingRight: "8px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: v("on-surface-variant"),
    },
    ".cm-activeLine": {
      backgroundColor: `rgb(var(--c-surface-container-high) / 0.35)`,
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 4px",
      minWidth: "32px",
      textAlign: "right",
    },
    ".cm-panels": {
      backgroundColor: v("surface-container-low"),
      color: v("on-surface"),
      borderTop: `1px solid ${v("surface-container-high")}`,
    },
    ".cm-panel.cm-search": {
      padding: "8px 16px",
    },
    ".cm-panel.cm-search input": {
      backgroundColor: v("background"),
      color: v("on-surface"),
      border: `1px solid ${v("surface-container-high")}`,
      borderRadius: "0",
      padding: "2px 6px",
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: "12px",
    },
    ".cm-panel.cm-search input:focus": {
      outline: "none",
      borderColor: v("outline-variant"),
    },
    ".cm-panel.cm-search button": {
      backgroundColor: "transparent",
      color: v("on-surface-variant"),
      border: `1px solid ${v("surface-container-high")}`,
      borderRadius: "0",
      padding: "2px 8px",
      marginLeft: "4px",
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: "11px",
      cursor: "pointer",
    },
    ".cm-panel.cm-search button:hover": {
      borderColor: v("outline-variant"),
      color: v("on-surface"),
    },
    ".cm-panel.cm-search label": {
      color: v("on-surface-variant"),
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: "11px",
      marginRight: "8px",
    },
    ".cm-searchMatch": {
      backgroundColor: v("surface-container-high"),
      outline: `1px solid ${v("outline-variant")}`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: v("secondary-container"),
    },
    ".cm-tooltip": {
      backgroundColor: v("surface-container-low"),
      border: `1px solid ${v("surface-container-high")}`,
      borderRadius: "0",
      color: v("on-surface"),
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: "12px",
      padding: "2px 8px",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: v("surface-container-high"),
      color: v("on-surface"),
    },
  },
  { dark: true },
);
