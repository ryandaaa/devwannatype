import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../components/Icon";
import { slugifyHeading } from "./OutlinePanel";

export interface MarkdownPreviewProps {
  source: string;
  onWikiNavigate?: (title: string) => void;
  onTaskToggle?: (occurrence: number, checked: boolean) => void;
}

/**
 * Pre-process source: turn `[[Title]]` into `[Title](#wiki:Title)` agar react-markdown
 * memparsing sebagai link biasa, lalu kita intercept di komponen `a`.
 * Skip kalau di dalam code fence atau inline code.
 */
function preprocessWikiLinks(source: string): string {
  if (!source) return source;
  const lines = source.split("\n");
  let inFence = false;
  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      // Replace di luar inline code juga: scan char by char
      let out = "";
      let i = 0;
      let inInline = false;
      while (i < line.length) {
        const c = line[i];
        if (c === "`") {
          inInline = !inInline;
          out += c;
          i++;
          continue;
        }
        if (!inInline && c === "[" && line[i + 1] === "[") {
          const close = line.indexOf("]]", i + 2);
          if (close > 0) {
            const title = line.slice(i + 2, close).trim();
            const safe = title.replace(/\)/g, "%29");
            out += `[${title}](#wiki:${encodeURIComponent(safe)})`;
            i = close + 2;
            continue;
          }
        }
        out += c;
        i++;
      }
      return out;
    })
    .join("\n");
}

export function MarkdownPreview({
  source,
  onWikiNavigate,
  onTaskToggle,
}: MarkdownPreviewProps) {
  const processed = useMemo(() => preprocessWikiLinks(source), [source]);
  // Counter untuk track urutan checkbox saat render
  const checkboxCounterRef = useRef(0);
  // Counter heading utk slug uniqueness (jika judul duplikat)
  const slugCounterRef = useRef<Record<string, number>>({});

  // Reset counter di awal tiap render
  checkboxCounterRef.current = 0;
  slugCounterRef.current = {};

  function makeSlug(text: string): string {
    const base = slugifyHeading(text);
    const c = (slugCounterRef.current[base] ?? 0) + 1;
    slugCounterRef.current[base] = c;
    return c === 1 ? base : `${base}-${c}`;
  }

  function headingText(node: ReactNode): string {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(headingText).join("");
    if (node && typeof node === "object" && "props" in (node as unknown as Record<string, unknown>)) {
      const props = (node as { props: { children?: ReactNode } }).props;
      return headingText(props.children);
    }
    return "";
  }

  return (
    <div className="flex-1 overflow-y-auto p-lg lg:p-[48px] bg-background">
      <div className="max-w-[820px] mx-auto">
        {!source.trim() && (
          <div className="font-code text-body-sm text-on-surface-variant opacity-60">
            preview is empty — switch back to edit mode (Ctrl+\) and start typing
          </div>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            h1: ({ children }) => {
              const slug = makeSlug(headingText(children));
              return (
                <h1
                  data-heading-slug={slug}
                  className="font-display text-display text-on-surface mb-lg tracking-tight"
                >
                  {children}
                </h1>
              );
            },
            h2: ({ children }) => {
              const slug = makeSlug(headingText(children));
              return (
                <h2
                  data-heading-slug={slug}
                  className="font-headline-lg text-headline-lg text-on-surface mt-xl mb-md"
                >
                  {children}
                </h2>
              );
            },
            h3: ({ children }) => {
              const slug = makeSlug(headingText(children));
              return (
                <h3
                  data-heading-slug={slug}
                  className="font-headline-sm text-headline-sm text-on-surface mt-lg mb-sm"
                >
                  {children}
                </h3>
              );
            },
            h4: ({ children }) => {
              const slug = makeSlug(headingText(children));
              return (
                <h4
                  data-heading-slug={slug}
                  className="font-headline-sm text-headline-sm text-on-surface mt-md mb-xs"
                >
                  {children}
                </h4>
              );
            },
            p: ({ children }) => (
              <p className="font-code text-body-md text-on-surface-variant mb-md leading-relaxed">
                {children}
              </p>
            ),
            ul: ({ children, className }) => {
              const isTaskList = className?.includes("contains-task-list");
              return (
                <ul
                  className={`mb-md font-code text-body-md text-on-surface-variant marker:text-on-surface-variant space-y-xs ${
                    isTaskList ? "list-none ml-0" : "list-disc ml-lg"
                  }`}
                >
                  {children}
                </ul>
              );
            },
            ol: ({ children }) => (
              <ol className="list-decimal ml-lg mb-md font-code text-body-md text-on-surface-variant marker:text-on-surface-variant space-y-xs">
                {children}
              </ol>
            ),
            li: ({ children, className }) => {
              const isTask = className?.includes("task-list-item");
              if (isTask) {
                return <li className="leading-relaxed flex items-start gap-sm">{children}</li>;
              }
              return <li className="leading-relaxed">{children}</li>;
            },
            a: ({ children, href }) => {
              if (href?.startsWith("#wiki:")) {
                const title = decodeURIComponent(href.slice(6));
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onWikiNavigate?.(title);
                    }}
                    className="text-on-surface underline decoration-outline-variant hover:decoration-on-surface bg-transparent p-0 m-0 inline cursor-pointer"
                  >
                    {children}
                  </button>
                );
              }
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-on-surface underline decoration-outline-variant hover:decoration-on-surface"
                >
                  {children}
                </a>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-outline-variant pl-md my-md font-code text-body-md text-on-surface-variant opacity-80">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-lg border-t border-surface-container-high" />,
            table: ({ children }) => (
              <div className="overflow-x-auto my-md border border-surface-container-high">
                <table className="w-full font-code text-body-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-surface-container-low">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="px-md py-sm border-b border-surface-container-high text-left font-medium text-on-surface">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-md py-sm border-b border-surface-container-high text-on-surface-variant">
                {children}
              </td>
            ),
            code({ className, children, ...rest }) {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="px-xs py-[1px] bg-surface-container-low border border-surface-container-high font-code text-[12px] text-on-surface">
                    {children}
                  </code>
                );
              }
              const match = /language-(\w+)/.exec(className ?? "");
              const lang = match?.[1];
              const text = String(children).replace(/\n$/, "");
              return (
                <CodeBlock
                  lang={lang}
                  className={className}
                  text={text}
                  rest={rest}
                />
              );
            },
            pre: ({ children }) => <>{children}</>,
            strong: ({ children }) => (
              <strong className="font-semibold text-on-surface">{children}</strong>
            ),
            em: ({ children }) => <em className="italic text-on-surface">{children}</em>,
            input: ({ checked, type, disabled }) => {
              if (type === "checkbox") {
                const idx = checkboxCounterRef.current;
                checkboxCounterRef.current += 1;
                return (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={!!checked}
                    aria-label={checked ? "Uncheck" : "Check"}
                    disabled={!onTaskToggle || disabled}
                    onClick={() => onTaskToggle?.(idx, !checked)}
                    className={`inline-flex shrink-0 items-center justify-center w-[14px] h-[14px] mt-[3px] border border-surface-container-high transition-colors ${
                      onTaskToggle ? "hover:border-outline-variant cursor-pointer" : "cursor-default opacity-70"
                    } ${checked ? "bg-on-surface" : "bg-surface-container-low"}`}
                  >
                    {checked && (
                      <span
                        className="material-symbols-outlined text-surface"
                        style={{ fontSize: "10px" }}
                      >
                        check
                      </span>
                    )}
                  </button>
                );
              }
              return null;
            },
          }}
        >
          {processed}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function CodeBlock({
  lang,
  className,
  text,
  rest,
}: {
  lang: string | undefined;
  className: string | undefined;
  text: string;
  rest: object;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-lg border border-surface-container-high bg-surface-container-lowest rounded-none overflow-hidden">
      <div className="flex items-center justify-between px-md py-sm border-b border-surface-container-high bg-surface-container-low">
        <span className="font-code text-[11px] text-on-surface-variant">
          {lang ?? "text"}
        </span>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            aria-label="Copy code"
            className="text-on-surface-variant hover:text-on-surface flex items-center gap-xs"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              } catch {
                /* ignore */
              }
            }}
          >
            <Icon name={copied ? "check" : "content_copy"} size={14} />
          </button>
        </div>
      </div>
      <pre className="p-md font-code text-code text-primary overflow-x-auto m-0">
        <code className={className} {...rest}>
          {text}
        </code>
      </pre>
    </div>
  );
}
