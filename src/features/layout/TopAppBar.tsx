import { Icon } from "../../components/Icon";
import { useCreateAndSelectNote } from "../notes/useCreateAndSelectNote";
import { useCreateNote } from "../notes/hooks";
import { useLayoutStore } from "./store";
import { importMarkdownFiles } from "../importexport";
import { toast } from "../../components/toast/toastStore";
import { WindowControls } from "./WindowControls";
import { useOverlayStore } from "../palette/overlayStore";

export function TopAppBar() {
  const create = useCreateAndSelectNote();
  const createNote = useCreateNote();
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const showSidebar = useLayoutStore((s) => s.showSidebar);
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);
  const setActiveView = useLayoutStore((s) => s.setActiveView);
  const togglePalette = useOverlayStore((s) => s.togglePalette);
  const toggleCheatsheet = useOverlayStore((s) => s.toggleCheatsheet);
  const toggleSettings = useOverlayStore((s) => s.toggleSettings);

  async function onImport() {
    try {
      const items = await importMarkdownFiles();
      if (items.length === 0) return;
      let lastId = "";
      for (const item of items) {
        const note = await createNote.mutateAsync({
          type: "markdown",
          title: item.title,
          content: item.content,
          sourcePath: item.sourcePath,
        });
        lastId = note.id;
      }
      if (lastId) {
        setActiveView("inbox");
        setSelectedNoteId(lastId);
        toast.success(
          `${items.length} ${items.length === 1 ? "note" : "notes"} imported`,
        );
      }
    } catch (e) {
      console.error("[import] failed:", e);
      toast.error("Import failed", String(e));
    }
  }

  return (
    <header
      data-tauri-drag-region
      className="bg-surface-container-low h-[48px] border-b border-surface-container-high flex justify-between items-center w-full shrink-0 select-none"
    >
      <div className="flex items-center h-full">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={showSidebar ? "Collapse sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
          title={showSidebar ? "Collapse sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
          className="w-[48px] h-full flex items-center justify-center hover:bg-surface-variant transition-colors duration-150 text-on-surface-variant hover:text-on-surface"
        >
          <Icon name={showSidebar ? "menu_open" : "menu"} size={18} />
        </button>
        <span
          data-tauri-drag-region
          className="font-headline-sm text-headline-sm text-on-surface tracking-tight pl-sm"
        >
          devwannatype
        </span>
      </div>

      <div className="flex items-center h-full font-code text-body-md text-primary">
        <div className="flex items-center gap-sm pr-md">
          <button
            type="button"
            onClick={togglePalette}
            className="flex items-center gap-sm px-sm py-xs border border-surface-container-high bg-background hover:border-outline-variant transition-colors duration-150 rounded-none cursor-pointer active:opacity-80"
            aria-label="Open command palette (Ctrl+K)"
          >
            <Icon name="search" size={16} className="text-on-surface-variant" />
            <span className="font-code text-code text-on-surface-variant">Cmd+K</span>
          </button>

          <div className="flex items-center border-l border-surface-container-high pl-sm ml-xs gap-xs">
            <IconButton icon="upload_file" label="Import .md" onClick={onImport} />
            <IconButton
              icon="help_outline"
              label="Keyboard shortcuts (?)"
              onClick={toggleCheatsheet}
            />
            <IconButton icon="settings" label="Settings" onClick={toggleSettings} />
            <button
              type="button"
              aria-label="New note"
              onClick={() => create.mutateAsync()}
              disabled={create.isPending}
              className="w-[32px] h-[32px] flex items-center justify-center bg-primary text-surface hover:opacity-90 transition-opacity duration-150 rounded-none cursor-pointer active:opacity-80 ml-xs disabled:opacity-50"
            >
              <Icon name="add" size={18} />
            </button>
          </div>
        </div>

        {/* Native-replacement window controls (decorations: false) */}
        <div className="border-l border-surface-container-high h-full">
          <WindowControls />
        </div>
      </div>
    </header>
  );
}

function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-[32px] h-[32px] flex items-center justify-center hover:bg-surface-variant transition-colors duration-150 text-on-surface-variant hover:text-on-surface rounded-none cursor-pointer active:opacity-80"
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
