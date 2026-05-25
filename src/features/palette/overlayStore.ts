import { create } from "zustand";

interface OverlayState {
  paletteOpen: boolean;
  cheatsheetOpen: boolean;
  settingsOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  setCheatsheetOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  togglePalette: () => void;
  toggleCheatsheet: () => void;
  toggleSettings: () => void;
}

export const useOverlayStore = create<OverlayState>((set, get) => ({
  paletteOpen: false,
  cheatsheetOpen: false,
  settingsOpen: false,
  setPaletteOpen: (v) => set({ paletteOpen: v }),
  setCheatsheetOpen: (v) => set({ cheatsheetOpen: v }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  togglePalette: () => set({ paletteOpen: !get().paletteOpen }),
  toggleCheatsheet: () => set({ cheatsheetOpen: !get().cheatsheetOpen }),
  toggleSettings: () => set({ settingsOpen: !get().settingsOpen }),
}));
