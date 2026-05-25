import { create } from "zustand";

interface TerminalState {
  /** Active PTY session id — di-set oleh TerminalPanel saat spawn. */
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),
}));
