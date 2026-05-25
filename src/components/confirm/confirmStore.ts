import { create } from "zustand";

export interface ConfirmRequest {
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Resolve dengan true kalau user confirm, false kalau cancel/escape. */
  resolve: (ok: boolean) => void;
}

interface ConfirmState {
  pending: ConfirmRequest | null;
  ask: (
    input: Omit<ConfirmRequest, "resolve">,
  ) => Promise<boolean>;
  close: (ok: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  pending: null,
  ask: (input) =>
    new Promise<boolean>((resolve) => {
      set({ pending: { ...input, resolve } });
    }),
  close: (ok) => {
    const p = get().pending;
    if (p) p.resolve(ok);
    set({ pending: null });
  },
}));

/** Helper API: `await confirm({...})` returns boolean. */
export function confirmDialog(input: Omit<ConfirmRequest, "resolve">): Promise<boolean> {
  return useConfirmStore.getState().ask(input);
}
