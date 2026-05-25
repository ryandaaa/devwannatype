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

  setTheme: (t: Theme) => void;
  setAutosaveDelay: (n: number) => void;
  setVimMode: (v: boolean) => void;
  hydrate: () => Promise<void>;
}

const KEYS = {
  theme: "settings.theme",
  autosaveDelay: "settings.autosave_delay",
  vimMode: "settings.vim_mode",
} as const;

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

export const useSettingsStore = create<SettingsState>((set) => ({
  hydrated: false,
  theme: "dark",
  autosaveDelay: 400,
  vimMode: false,

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
      set({ hydrated: true, theme, autosaveDelay, vimMode });
      applyTheme(theme);
    } catch (e) {
      console.error("[settings] hydrate failed:", e);
      set({ hydrated: true });
    }
  },
}));
