import { LanguageSupport, LanguageDescription, StreamLanguage } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { yaml } from "@codemirror/lang-yaml";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { go } from "@codemirror/legacy-modes/mode/go";

/** Mapping bahasa snippet/command → CodeMirror language extension. */
export function languageExtension(
  lang: string | null | undefined,
): LanguageSupport | StreamLanguage<unknown>[] | null {
  if (!lang) return null;
  const key = lang.toLowerCase();
  switch (key) {
    case "markdown":
    case "md":
      return markdown({ codeLanguages: markdownCodeLanguages });
    case "javascript":
    case "js":
      return javascript();
    case "typescript":
    case "ts":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "jsx":
      return javascript({ jsx: true });
    case "python":
    case "py":
      return python();
    case "rust":
    case "rs":
      return rust();
    case "sql":
      return sql();
    case "json":
      return json();
    case "html":
      return html();
    case "css":
      return css();
    case "yaml":
    case "yml":
      return yaml();
    case "bash":
    case "sh":
    case "shell":
    case "zsh":
    case "fish":
      return [StreamLanguage.define(shell)];
    case "go":
      return [StreamLanguage.define(go)];
    default:
      return null;
  }
}

/** Daftar bahasa yang didukung di code fence markdown — dipakai saat parsing. */
export const markdownCodeLanguages: LanguageDescription[] = [
  LanguageDescription.of({
    name: "javascript",
    alias: ["js", "node"],
    async load() {
      return javascript();
    },
  }),
  LanguageDescription.of({
    name: "typescript",
    alias: ["ts"],
    async load() {
      return javascript({ typescript: true });
    },
  }),
  LanguageDescription.of({
    name: "tsx",
    async load() {
      return javascript({ typescript: true, jsx: true });
    },
  }),
  LanguageDescription.of({
    name: "jsx",
    async load() {
      return javascript({ jsx: true });
    },
  }),
  LanguageDescription.of({
    name: "python",
    alias: ["py"],
    async load() {
      return python();
    },
  }),
  LanguageDescription.of({
    name: "rust",
    alias: ["rs"],
    async load() {
      return rust();
    },
  }),
  LanguageDescription.of({
    name: "go",
    async load() {
      return new LanguageSupport(StreamLanguage.define(go));
    },
  }),
  LanguageDescription.of({
    name: "sql",
    async load() {
      return sql();
    },
  }),
  LanguageDescription.of({
    name: "json",
    async load() {
      return json();
    },
  }),
  LanguageDescription.of({
    name: "html",
    async load() {
      return html();
    },
  }),
  LanguageDescription.of({
    name: "css",
    async load() {
      return css();
    },
  }),
  LanguageDescription.of({
    name: "yaml",
    alias: ["yml"],
    async load() {
      return yaml();
    },
  }),
  LanguageDescription.of({
    name: "bash",
    alias: ["sh", "shell", "zsh", "fish"],
    async load() {
      return new LanguageSupport(StreamLanguage.define(shell));
    },
  }),
];

/** Daftar bahasa yang didukung — untuk dropdown UI. */
export const SUPPORTED_LANGUAGES: { value: string; label: string }[] = [
  { value: "bash", label: "bash" },
  { value: "css", label: "css" },
  { value: "go", label: "go" },
  { value: "html", label: "html" },
  { value: "javascript", label: "javascript" },
  { value: "json", label: "json" },
  { value: "markdown", label: "markdown" },
  { value: "python", label: "python" },
  { value: "rust", label: "rust" },
  { value: "sql", label: "sql" },
  { value: "typescript", label: "typescript" },
  { value: "yaml", label: "yaml" },
];
