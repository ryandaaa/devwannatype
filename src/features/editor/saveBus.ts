import { create } from "zustand";

interface SaveBus {
  /** Function yang dipanggil saat user trigger save (Ctrl+S). EditorArea register
   *  saat mount, deregister saat unmount / ganti note. */
  flushHandler: (() => void) | null;
  setFlushHandler: (fn: (() => void) | null) => void;
  flush: () => void;
}

/**
 * Pub-sub kecil untuk Ctrl+S — dipanggil dari global shortcut,
 * di-handle oleh EditorArea via ref.
 */
export const useSaveBus = create<SaveBus>((set, get) => ({
  flushHandler: null,
  setFlushHandler: (fn) => set({ flushHandler: fn }),
  flush: () => {
    const fn = get().flushHandler;
    if (fn) fn();
  },
}));
