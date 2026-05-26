import { create } from "zustand";
import { getDb } from "../../db";
import type { ViewId } from "../../db/schema";
import { debounce } from "../../lib/debounce";

export interface LayoutState {
  /** Hydration status — false sampai loadSettings selesai */
  hydrated: boolean;

  // Panel sizes (px)
  sidebarW: number;
  noteListW: number;

  // Panel visibility
  showSidebar: boolean;
  showPreview: boolean;
  showOutline: boolean;

  // Navigation state
  activeView: ViewId;
  selectedNoteId: string | null;

  // Save status untuk note aktif
  saveStatus: "saved" | "saving" | "dirty";
  setSaveStatus: (s: "saved" | "saving" | "dirty") => void;

  // Zen mode (F11) — sembunyikan semua kecuali editor
  zen: boolean;
  toggleZen: () => void;
  setZen: (v: boolean) => void;

  // Actions
  setSidebarW: (n: number) => void;
  setNoteListW: (n: number) => void;
  setShowSidebar: (v: boolean) => void;
  setShowPreview: (v: boolean) => void;
  setShowOutline: (v: boolean) => void;
  toggleSidebar: () => void;
  togglePreview: () => void;
  toggleOutline: () => void;
  setActiveView: (v: ViewId) => void;
  setSelectedNoteId: (id: string | null) => void;

  hydrate: () => Promise<void>;
}

const DEFAULTS = {
  sidebarW: 240,
  noteListW: 280,
  showSidebar: true,
  showPreview: false,
  showOutline: false,
  activeView: "inbox" as ViewId,
  selectedNoteId: null as string | null,
  saveStatus: "saved" as "saved" | "saving" | "dirty",
  zen: false,
};

const SETTING_KEYS = {
  sidebarW: "layout.sidebar_w",
  noteListW: "layout.notelist_w",
  showSidebar: "layout.show_sidebar",
  showPreview: "layout.show_preview",
  showOutline: "layout.show_outline",
  activeView: "nav.active_view",
  selectedNoteId: "nav.selected_note_id",
} as const;

async function persistSetting(key: string, value: string) {
  const db = await getDb();
  await db.execute(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

const persistDebounced = debounce((key: string, value: string) => {
  persistSetting(key, value).catch((err) => {
    // Tidak crash UI — log saja
    console.error("[layout] persist failed:", key, err);
  });
}, 300);

export const useLayoutStore = create<LayoutState>((set, get) => ({
  hydrated: false,
  ...DEFAULTS,

  setSidebarW: (n) => {
    set({ sidebarW: n });
    persistDebounced(SETTING_KEYS.sidebarW, String(n));
  },
  setNoteListW: (n) => {
    set({ noteListW: n });
    persistDebounced(SETTING_KEYS.noteListW, String(n));
  },
  setShowSidebar: (v) => {
    set({ showSidebar: v });
    persistDebounced(SETTING_KEYS.showSidebar, v ? "1" : "0");
  },
  setShowPreview: (v) => {
    set({ showPreview: v });
    persistDebounced(SETTING_KEYS.showPreview, v ? "1" : "0");
  },
  setShowOutline: (v) => {
    set({ showOutline: v });
    persistDebounced(SETTING_KEYS.showOutline, v ? "1" : "0");
  },
  toggleSidebar: () => get().setShowSidebar(!get().showSidebar),
  togglePreview: () => get().setShowPreview(!get().showPreview),
  toggleOutline: () => get().setShowOutline(!get().showOutline),
  setActiveView: (v) => {
    set({ activeView: v });
    persistDebounced(SETTING_KEYS.activeView, v);
  },
  setSelectedNoteId: (id) => {
    set({ selectedNoteId: id });
    persistDebounced(SETTING_KEYS.selectedNoteId, id ?? "");
  },
  setSaveStatus: (s) => set({ saveStatus: s }),
  toggleZen: () => set({ zen: !get().zen }),
  setZen: (v) => set({ zen: v }),

  hydrate: async () => {
    try {
      const db = await getDb();
      const rows = await db.select<Array<{ key: string; value: string }>>(
        "SELECT key, value FROM app_settings",
      );
      const map = new Map(rows.map((r) => [r.key, r.value]));

      const num = (k: string, d: number) => {
        const v = map.get(k);
        if (v === undefined) return d;
        const n = Number(v);
        return Number.isFinite(n) ? n : d;
      };
      const bool = (k: string, d: boolean) => {
        const v = map.get(k);
        if (v === undefined) return d;
        return v === "1";
      };
      const str = <T extends string>(k: string, d: T, allowed?: readonly T[]): T => {
        const v = map.get(k);
        if (v === undefined) return d;
        if (allowed && !(allowed as readonly string[]).includes(v)) return d;
        return v as T;
      };

      const validViews = ["inbox", "pinned", "snippets", "archive", "trash"] as const;

      set({
        hydrated: true,
        sidebarW: num(SETTING_KEYS.sidebarW, DEFAULTS.sidebarW),
        noteListW: num(SETTING_KEYS.noteListW, DEFAULTS.noteListW),
        showSidebar: bool(SETTING_KEYS.showSidebar, DEFAULTS.showSidebar),
        showPreview: bool(SETTING_KEYS.showPreview, DEFAULTS.showPreview),
        showOutline: bool(SETTING_KEYS.showOutline, DEFAULTS.showOutline),
        activeView: str(SETTING_KEYS.activeView, DEFAULTS.activeView, validViews),
        selectedNoteId: map.get(SETTING_KEYS.selectedNoteId) || null,
      });
    } catch (err) {
      console.error("[layout] hydrate failed:", err);
      set({ hydrated: true }); // tetap unblock UI
    }
  },
}));
