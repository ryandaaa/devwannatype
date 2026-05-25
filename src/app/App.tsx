import { TopAppBar } from "../features/layout/TopAppBar";
import { SideNavBar } from "../features/nav/SideNavBar";
import { NoteList } from "../features/notes/NoteList";
import { EditorArea } from "../features/editor/EditorArea";
import { TerminalPanel } from "../features/terminal/TerminalPanel";
import { ResizeHandle } from "../features/layout/ResizeHandle";
import { CommandPalette } from "../features/palette/CommandPalette";
import { Cheatsheet } from "../features/palette/Cheatsheet";
import { SettingsModal } from "../features/settings/SettingsModal";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ToastViewport } from "../components/toast/ToastViewport";
import { ConfirmDialog } from "../components/confirm/ConfirmDialog";
import { AppProviders } from "./providers";
import { useLayoutStore } from "../features/layout/store";
import { useGlobalShortcuts } from "../features/shortcuts/useGlobalShortcuts";
import { useOverlayStore } from "../features/palette/overlayStore";
import { useFileDropImport } from "../features/importexport/useFileDropImport";
import { usePendingFiles } from "../features/importexport/usePendingFiles";

const COLLAPSED_SIDEBAR_W = 48;

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <Shell />
      </AppProviders>
    </ErrorBoundary>
  );
}

function Shell() {
  useGlobalShortcuts();
  const drop = useFileDropImport();
  usePendingFiles();

  const showSidebar = useLayoutStore((s) => s.showSidebar);
  const showTerminal = useLayoutStore((s) => s.showTerminal);
  const sidebarW = useLayoutStore((s) => s.sidebarW);
  const noteListW = useLayoutStore((s) => s.noteListW);
  const terminalH = useLayoutStore((s) => s.terminalH);
  const setSidebarW = useLayoutStore((s) => s.setSidebarW);
  const setNoteListW = useLayoutStore((s) => s.setNoteListW);
  const setTerminalH = useLayoutStore((s) => s.setTerminalH);
  const zen = useLayoutStore((s) => s.zen);
  const toggleZen = useLayoutStore((s) => s.toggleZen);

  const paletteOpen = useOverlayStore((s) => s.paletteOpen);
  const setPaletteOpen = useOverlayStore((s) => s.setPaletteOpen);
  const cheatsheetOpen = useOverlayStore((s) => s.cheatsheetOpen);
  const setCheatsheetOpen = useOverlayStore((s) => s.setCheatsheetOpen);
  const settingsOpen = useOverlayStore((s) => s.settingsOpen);
  const setSettingsOpen = useOverlayStore((s) => s.setSettingsOpen);

  const sidebarCollapsed = !showSidebar;
  const effectiveSidebarW = sidebarCollapsed ? COLLAPSED_SIDEBAR_W : sidebarW;

  if (zen) {
    return (
      <ZenShell
        terminalShown={false}
        onExit={toggleZen}
      />
    );
  }

  return (
    <>
      <TopAppBar />
      <main className="flex flex-1 overflow-hidden w-full h-full relative">
        <SideNavBar width={effectiveSidebarW} collapsed={sidebarCollapsed} />
        {!sidebarCollapsed && (
          <ResizeHandle
            direction="col"
            value={sidebarW}
            min={180}
            max={400}
            onChange={setSidebarW}
          />
        )}
        <NoteList width={noteListW} />
        <ResizeHandle
          direction="col"
          value={noteListW}
          min={220}
          max={500}
          onChange={setNoteListW}
        />
        <section className="flex-1 bg-background flex flex-col relative overflow-hidden min-w-0">
          <EditorArea bottomPad={showTerminal ? terminalH : 0} />
          {showTerminal && (
            <TerminalPanel
              height={terminalH}
              onResizeStart={setTerminalH}
              currentHeight={terminalH}
            />
          )}
        </section>

        {drop.hovering && (
          <div className="absolute inset-0 z-30 bg-background/70 border-2 border-dashed border-outline-variant flex items-center justify-center pointer-events-none">
            <span className="font-code text-body-md text-on-surface">
              drop .md / .txt to import
            </span>
          </div>
        )}
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Cheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConfirmDialog />
      <ToastViewport />
    </>
  );
}

function ZenShell({ onExit }: { terminalShown: boolean; onExit: () => void }) {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-background">
      <EditorArea bottomPad={0} />
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit zen mode (F11)"
        title="Exit zen mode (F11)"
        className="absolute top-md right-md z-30 w-[28px] h-[28px] flex items-center justify-center border border-surface-container-high bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:border-outline-variant transition-colors opacity-40 hover:opacity-100"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
          fullscreen_exit
        </span>
      </button>
    </div>
  );
}
