import { create } from "zustand";
import { getDb } from "../../db";
import { debounce } from "../../lib/debounce";

export type Theme = "dark" | "light" | "pink" | "rose-pine" | "solarized-light" | "nord";

export const THEMES: Theme[] = [
  "dark",
  "light",
  "pink",
  "rose-pine",
  "solarized-light",
  "nord",
];

interface SettingsState {
  hydrated: boolean;
  theme: Theme;
  autosaveDelay: number; // ms
  vimMode: boolean;
  editorFontSize: number; // px

  setTheme: (t: Theme) => void;
  setAutosaveDelay: (n: number) => void;
  setVimMode: (v: boolean) => void;
  setEditorFontSize: (n: number) => void;
  bumpEditorFontSize: (delta: number) => void;
  resetEditorFontSize: () => void;
  hydrate: () => Promise<void>;
}

const KEYS = {
  theme: "settings.theme",
  autosaveDelay: "settings.autosave_delay",
  vimMode: "settings.vim_mode",
  editorFontSize: "settings.editor_font_size",
} as const;

const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 40;
const FONT_SIZE_DEFAULT = 13;

const clampFontSize = (n: number) =>
  Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(n)));

const persistDebounced = debounce(async (key: string, value: string) => {
  try {
    const db = await getDb();
    await db.execute(
      "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
    );
  } catch (e) {
    console.error("[settings] persist failed:", e);
  }
}, 200);

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.remove(
    "theme-dark",
    "theme-light",
    "theme-pink",
    "theme-rose-pine",
    "theme-solarized-light",
    "theme-nord",
  );
  html.classList.add(`theme-${t}`);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hydrated: false,
  theme: "dark",
  autosaveDelay: 400,
  vimMode: false,
  editorFontSize: FONT_SIZE_DEFAULT,

  setTheme: (t) => {
    set({ theme: t });
    applyTheme(t);
    persistDebounced(KEYS.theme, t);
  },
  setAutosaveDelay: (n) => {
    set({ autosaveDelay: n });
    persistDebounced(KEYS.autosaveDelay, String(n));
  },
  setVimMode: (v) => {
    set({ vimMode: v });
    persistDebounced(KEYS.vimMode, v ? "1" : "0");
  },
  setEditorFontSize: (n) => {
    const next = clampFontSize(n);
    set({ editorFontSize: next });
    persistDebounced(KEYS.editorFontSize, String(next));
  },
  bumpEditorFontSize: (delta) => {
    get().setEditorFontSize(get().editorFontSize + delta);
  },
  resetEditorFontSize: () => {
    get().setEditorFontSize(FONT_SIZE_DEFAULT);
  },

  hydrate: async () => {
    try {
      const db = await getDb();
      const rows = await db.select<Array<{ key: string; value: string }>>(
        "SELECT key, value FROM app_settings WHERE key LIKE 'settings.%'",
      );
      const map = new Map(rows.map((r) => [r.key, r.value]));
      const rawTheme = (map.get(KEYS.theme) as Theme) || "dark";
      const valid: Theme[] = ["dark", "light", "pink", "rose-pine", "solarized-light", "nord"];
      const theme: Theme = valid.includes(rawTheme) ? rawTheme : "dark";
      const autosaveDelay = Number(map.get(KEYS.autosaveDelay)) || 400;
      const vimMode = map.get(KEYS.vimMode) === "1";
      const rawFs = Number(map.get(KEYS.editorFontSize));
      const editorFontSize = Number.isFinite(rawFs) && rawFs > 0
        ? clampFontSize(rawFs)
        : FONT_SIZE_DEFAULT;
      set({ hydrated: true, theme, autosaveDelay, vimMode, editorFontSize });
      applyTheme(theme);
    } catch (e) {
      console.error("[settings] hydrate failed:", e);
      set({ hydrated: true });
    }
  },
}));
