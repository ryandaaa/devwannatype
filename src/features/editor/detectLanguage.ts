/**
 * Heuristik deteksi bahasa dari konten snippet.
 * Cek shebang, lalu pattern signature per bahasa.
 * Return string lowercase yang cocok dengan SUPPORTED_LANGUAGES, atau null.
 */
export function detectLanguage(content: string): string | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;

  // Shebang
  const firstLine = trimmed.split("\n", 1)[0];
  if (firstLine.startsWith("#!")) {
    if (/\b(bash|sh|zsh)\b/.test(firstLine)) return "bash";
    if (/\bpython/.test(firstLine)) return "python";
    if (/\bnode/.test(firstLine)) return "javascript";
    if (/\bdeno/.test(firstLine)) return "typescript";
    if (/\bruby/.test(firstLine)) return "bash"; // fallback (no ruby support)
  }

  const head = trimmed.slice(0, 2000);

  // Rust
  if (/^\s*fn\s+main\s*\(/m.test(head)) return "rust";
  if (/\b(let\s+mut\b|impl\s+\w+\s+for\b|use\s+\w+::)/m.test(head)) return "rust";

  // Go
  if (/^\s*package\s+\w+\s*$/m.test(head) && /\bfunc\b/.test(head)) return "go";
  if (/^\s*import\s*\(\s*$/m.test(head) && /\bfunc\b/.test(head)) return "go";

  // Python
  if (/^\s*def\s+\w+\s*\(/m.test(head)) return "python";
  if (/^\s*from\s+\w+\s+import\b/m.test(head)) return "python";
  if (/^\s*import\s+\w+\s*$/m.test(head) && !/\bpackage\s+\w+\b/.test(head)) return "python";

  // TypeScript / JavaScript
  if (/\b(interface\s+\w+\s*\{|type\s+\w+\s*=|:\s*(string|number|boolean)\b)/m.test(head))
    return "typescript";
  if (/\b(const|let|var)\s+\w+\s*=/.test(head) && /=>|function\s*\(/.test(head))
    return "javascript";

  // SQL
  if (
    /^\s*(select|insert|update|delete|create\s+table|alter\s+table|with\s+\w+)/im.test(head)
  )
    return "sql";

  // JSON
  if (/^\s*[\[{]/.test(trimmed) && /[\]}]\s*$/.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      /* not json */
    }
  }

  // YAML
  if (/^\s*[a-zA-Z][\w-]*:\s/m.test(head) && /^\s*-\s/m.test(head)) return "yaml";

  // HTML
  if (/<!doctype\s+html/i.test(head)) return "html";
  if (/<html[\s>]/i.test(head)) return "html";

  // CSS
  if (/^\s*[.#]?[a-zA-Z][\w-]*\s*\{[\s\S]*?\}/m.test(head) && /:\s*[^;]+;/.test(head))
    return "css";

  // Bash / shell — banyak heuristik possible, fokus ke command umum
  if (
    /\b(echo|cd|ls|grep|awk|sed|cat|export|sudo|apt|brew|npm|yarn|bun|cargo|docker|git|kubectl)\b/.test(
      head,
    )
  )
    return "bash";

  // Markdown
  if (/^#{1,6}\s+\w/m.test(head) || /^\s*[-*]\s+\w/m.test(head)) return "markdown";

  return null;
}
