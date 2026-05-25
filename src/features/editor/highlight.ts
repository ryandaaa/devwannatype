import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const v = (name: string) => `rgb(var(--c-${name}))`;

/**
 * Monochrome highlight selaras token. Pakai CSS variables agar otomatis switch
 * dark/light tanpa rebuild.
 */
export const cmHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: v("outline"), fontStyle: "italic" },
  { tag: t.lineComment, color: v("outline"), fontStyle: "italic" },
  { tag: t.blockComment, color: v("outline"), fontStyle: "italic" },
  { tag: t.docComment, color: v("outline"), fontStyle: "italic" },

  { tag: [t.keyword, t.controlKeyword, t.modifier], color: v("primary"), fontWeight: "500" },
  { tag: t.operator, color: v("on-surface-variant") },
  { tag: t.operatorKeyword, color: v("primary") },

  { tag: [t.string, t.special(t.string)], color: v("secondary") },
  { tag: t.regexp, color: v("secondary") },
  { tag: [t.number, t.bool, t.null], color: v("tertiary-container") },

  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: v("on-surface") },
  { tag: t.variableName, color: v("on-surface") },
  { tag: t.propertyName, color: v("on-surface-variant") },
  { tag: t.className, color: v("primary") },
  { tag: t.typeName, color: v("secondary") },

  { tag: t.tagName, color: v("primary") },
  { tag: t.attributeName, color: v("on-surface-variant") },
  { tag: t.attributeValue, color: v("secondary") },

  { tag: t.heading, color: v("primary"), fontWeight: "600" },
  { tag: t.heading1, color: v("primary"), fontWeight: "600" },
  { tag: t.heading2, color: v("primary"), fontWeight: "600" },
  { tag: t.heading3, color: v("primary"), fontWeight: "600" },

  { tag: t.link, color: v("secondary"), textDecoration: "underline" },
  { tag: t.url, color: v("secondary") },

  { tag: t.emphasis, fontStyle: "italic", color: v("on-surface") },
  { tag: t.strong, fontWeight: "600", color: v("primary") },
  { tag: t.strikethrough, textDecoration: "line-through", color: v("outline") },

  { tag: t.meta, color: v("outline") },
  { tag: t.invalid, color: v("error") },
  { tag: t.atom, color: v("tertiary-container") },
  { tag: t.special(t.brace), color: v("on-surface-variant") },
  { tag: [t.bracket, t.brace, t.squareBracket, t.angleBracket, t.paren], color: v("on-surface-variant") },
  { tag: t.punctuation, color: v("on-surface-variant") },
  { tag: t.separator, color: v("on-surface-variant") },
]);

export const cmHighlightExt = syntaxHighlighting(cmHighlightStyle);
