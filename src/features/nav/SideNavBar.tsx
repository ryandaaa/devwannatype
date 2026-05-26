import { Icon } from "../../components/Icon";
import { useLayoutStore } from "../layout/store";
import { useRecentNotes } from "../notes/useRecentNotes";
import type { ViewId, NoteRow } from "../../db/schema";

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, collapsed, onClick }: NavItemProps) {
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={collapsed ? label : undefined}
        aria-label={label}
        className={`flex items-center bg-surface-variant text-primary transition-all duration-200 ease-in-out font-code text-body-sm w-full text-left ${
          collapsed
            ? "justify-center py-sm"
            : "gap-sm px-sm py-xs border-l-2 border-primary"
        }`}
      >
        <Icon name={icon} size={18} className="text-primary shrink-0" />
        {!collapsed && <span className="font-bold truncate">{label}</span>}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={`flex items-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all duration-200 ease-in-out font-code text-body-sm group w-full text-left ${
        collapsed ? "justify-center py-sm" : "gap-sm px-sm py-xs"
      }`}
    >
      <Icon
        name={icon}
        size={18}
        className="group-hover:text-on-surface transition-colors duration-200 shrink-0"
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

const MAIN_ITEMS: { id: ViewId; icon: string; label: string }[] = [
  { id: "inbox", icon: "description", label: "Notes" },
  { id: "pinned", icon: "push_pin", label: "Pinned" },
  { id: "snippets", icon: "code", label: "Snippets" },
  { id: "archive", icon: "archive", label: "Archive" },
];

export function SideNavBar({ width, collapsed }: { width: number; collapsed: boolean }) {
  const activeView = useLayoutStore((s) => s.activeView);
  const setActiveView = useLayoutStore((s) => s.setActiveView);
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);
  const { data: recent = [] } = useRecentNotes(5);

  return (
    <nav
      className="bg-surface-container-low h-full border-r border-surface-container-high flex flex-col py-md shrink-0 dwt-anim-width overflow-hidden"
      style={{ width: `${width}px` }}
    >
      <div className={`flex flex-col gap-xs ${collapsed ? "px-0" : "px-sm"}`}>
        {MAIN_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            active={activeView === item.id}
            onClick={() => setActiveView(item.id)}
          />
        ))}
      </div>

      {/* Recent notes — hanya saat expanded */}
      {!collapsed && recent.length > 0 && (
        <div className="mt-md px-sm">
          <div className="px-sm py-xs font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider opacity-80">
            Recent
          </div>
          <div className="flex flex-col">
            {recent.map((n) => (
              <RecentItem
                key={n.id}
                note={n}
                onClick={() => {
                  // pindah ke view yang valid agar note muncul di list (Inbox)
                  setActiveView("inbox");
                  setSelectedNoteId(n.id);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div
        className={`flex flex-col gap-xs pt-md border-t border-surface-container-high ${
          collapsed ? "px-0 mx-0" : "px-sm mx-sm"
        }`}
      >
        <NavItem
          icon="delete"
          label="Trash"
          collapsed={collapsed}
          active={activeView === "trash"}
          onClick={() => setActiveView("trash")}
        />
      </div>
    </nav>
  );
}

function RecentItem({ note, onClick }: { note: NoteRow; onClick: () => void }) {
  const title = note.title || "Untitled";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="text-left px-sm py-[3px] font-code text-body-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors truncate"
    >
      {title}
    </button>
  );
}
