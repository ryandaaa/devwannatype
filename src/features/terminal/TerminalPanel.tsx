import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { Icon } from "../../components/Icon";
import { uid } from "../../lib/id";
import { useSettingsStore } from "../settings/store";
import { useTerminalStore } from "./store";

interface TerminalPanelProps {
  height: number;
  currentHeight: number;
  onResizeStart: (h: number) => void;
}

interface PtyDataEvent {
  id: string;
  data: string;
}

const cssVar = (name: string): string => {
  if (typeof document === "undefined") return "#000";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(`--c-${name}`)
    .trim();
  if (!v) return "#000";
  // v is "R G B"
  const parts = v.split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "#000";
  return `rgb(${parts[0]},${parts[1]},${parts[2]})`;
};

function buildXtermTheme() {
  return {
    background: cssVar("surface-container-lowest"),
    foreground: cssVar("on-surface"),
    cursor: cssVar("on-surface"),
    cursorAccent: cssVar("surface-container-lowest"),
    selectionBackground: cssVar("surface-container-high"),
    selectionForeground: cssVar("primary"),
    black: cssVar("surface-container-lowest"),
    red: cssVar("error"),
    green: cssVar("secondary"),
    yellow: cssVar("tertiary-container"),
    blue: cssVar("on-surface-variant"),
    magenta: cssVar("secondary"),
    cyan: cssVar("on-surface-variant"),
    white: cssVar("on-surface"),
    brightBlack: cssVar("outline-variant"),
    brightRed: cssVar("on-error-container"),
    brightGreen: cssVar("on-surface"),
    brightYellow: cssVar("tertiary-container"),
    brightBlue: cssVar("on-surface-variant"),
    brightMagenta: cssVar("on-surface"),
    brightCyan: cssVar("on-surface-variant"),
    brightWhite: cssVar("primary"),
  };
}

export function TerminalPanel({ height, currentHeight, onResizeStart }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string>("");
  const [branch, setBranch] = useState<string>("");
  const [collapsed, setCollapsed] = useState(false);
  const [exited, setExited] = useState(false);
  const [respawnCounter, setRespawnCounter] = useState(0);

  // Drag resize logic — sama seperti sebelumnya
  const startRef = useRef<{ y: number; h: number } | null>(null);
  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!startRef.current) return;
      const delta = e.clientY - startRef.current.y;
      const next = Math.max(80, Math.min(600, startRef.current.h - delta));
      onResizeStart(next);
    },
    [onResizeStart],
  );
  const onUp = useCallback(() => {
    startRef.current = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [onMove]);
  const onDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startRef.current = { y: e.clientY, h: currentHeight };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [currentHeight, onMove, onUp],
  );

  // Spawn xterm + PTY — re-spawn saat respawnCounter berubah (user click respawn)
  useEffect(() => {
    setExited(false);
    if (!containerRef.current) return;
    const term = new Terminal({
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "block",
      theme: buildXtermTheme(),
      allowProposedApi: true,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    termRef.current = term;
    fitRef.current = fit;
    fit.fit();

    const sessionId = uid();
    sessionIdRef.current = sessionId;
    useTerminalStore.getState().setSessionId(sessionId);

    const cols = term.cols;
    const rows = term.rows;

    let unlistenData: UnlistenFn | null = null;
    let unlistenExit: UnlistenFn | null = null;
    let cancelled = false;

    (async () => {
      unlistenData = await listen<PtyDataEvent>(`pty://data/${sessionId}`, (ev) => {
        if (termRef.current) termRef.current.write(ev.payload.data);
      });
      unlistenExit = await listen<PtyDataEvent>(`pty://exit/${sessionId}`, () => {
        if (termRef.current) termRef.current.write("\r\n[process exited]\r\n");
        setExited(true);
      });
      if (cancelled) return;
      try {
        await invoke("pty_spawn", { id: sessionId, cwd: null, cols, rows });
      } catch (e) {
        term.write(`\r\nfailed to start shell: ${String(e)}\r\n`);
      }
    })();

    const sub = term.onData((data) => {
      void invoke("pty_write", { id: sessionId, data }).catch(() => {});
    });

    return () => {
      cancelled = true;
      sub.dispose();
      if (unlistenData) unlistenData();
      if (unlistenExit) unlistenExit();
      void invoke("pty_kill", { id: sessionId }).catch(() => {});
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      type WindowWithSession = Window & { __dwt_pty_session?: string };
      const w = window as WindowWithSession;
      if (w.__dwt_pty_session === sessionId) w.__dwt_pty_session = undefined;
      if (useTerminalStore.getState().sessionId === sessionId) {
        useTerminalStore.getState().setSessionId(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respawnCounter]);
  useEffect(() => {
    const fit = fitRef.current;
    const term = termRef.current;
    if (!fit || !term || !containerRef.current) return;
    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        const sid = sessionIdRef.current;
        if (sid) {
          void invoke("pty_resize", { id: sid, cols: term.cols, rows: term.rows }).catch(
            () => {},
          );
        }
      } catch {
        /* ignore */
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Branch chip refresh
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const b = await invoke<string>("git_current_branch", { cwd: null });
        if (!cancelled) setBranch(b);
      } catch {
        /* ignore */
      }
    }
    void refresh();
    const t = window.setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  // Re-apply xterm theme saat user switch theme app
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    if (!termRef.current) return;
    // Beri waktu CSS variables update di DOM dulu
    const id = window.requestAnimationFrame(() => {
      if (termRef.current) termRef.current.options.theme = buildXtermTheme();
    });
    return () => window.cancelAnimationFrame(id);
  }, [theme]);

  const showBody = !collapsed;

  return (
    <div
      className="absolute bottom-0 w-full border-t border-surface-container-high bg-surface-container-lowest flex flex-col"
      style={{ height: `${height}px` }}
    >
      <div
        onMouseDown={onDown}
        className="h-[32px] px-md border-b border-surface-container-high bg-surface-container-low flex items-center justify-between cursor-row-resize select-none shrink-0"
      >
        <div className="flex items-center gap-sm">
          <Icon name="terminal" size={14} className="text-on-surface-variant" />
          <span className="font-code text-[11px] text-on-surface-variant uppercase tracking-wider">
            Local Terminal
          </span>
        </div>
        <div className="flex items-center gap-xs">
          {branch && (
            <div className="flex items-center gap-[2px] px-xs py-[2px] border border-surface-container-high rounded-none">
              <Icon name="fork_right" size={12} className="text-on-surface-variant" />
              <span className="font-code text-[10px] text-on-surface-variant">{branch}</span>
            </div>
          )}
          <button
            type="button"
            aria-label={collapsed ? "Expand terminal" : "Collapse terminal"}
            className="text-on-surface-variant hover:text-on-surface ml-sm"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
            }}
          >
            <Icon name={collapsed ? "expand_less" : "expand_more"} size={16} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 p-sm overflow-hidden bg-surface-container-lowest relative"
        style={{ display: showBody ? "block" : "none" }}
      >
        <div ref={containerRef} className="w-full h-full" />
        {exited && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-[1px]">
            <button
              type="button"
              onClick={() => setRespawnCounter((c) => c + 1)}
              className="flex items-center gap-sm px-md py-xs border border-surface-container-high bg-surface-container-low hover:border-outline-variant font-code text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Icon name="restart_alt" size={14} />
              <span>shell exited — restart</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
