import { create } from "zustand";

export type ToastKind = "info" | "success" | "error";

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  /** Optional secondary line (path, detail, etc). */
  detail?: string;
  /** ms; 0 = no auto-dismiss. */
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (input: { kind?: ToastKind; message: string; detail?: string; duration?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const MAX_TOASTS = 3;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (input) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast: Toast = {
      id,
      kind: input.kind ?? "info",
      message: input.message,
      detail: input.detail,
      duration: input.duration ?? 4000,
    };
    set((s) => ({
      toasts: [...s.toasts, toast].slice(-MAX_TOASTS),
    }));
    if (toast.duration > 0) {
      window.setTimeout(() => get().dismiss(id), toast.duration);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export const toast = {
  info: (msg: string, detail?: string) =>
    useToastStore.getState().push({ kind: "info", message: msg, detail }),
  success: (msg: string, detail?: string) =>
    useToastStore.getState().push({ kind: "success", message: msg, detail }),
  error: (msg: string, detail?: string) =>
    useToastStore
      .getState()
      .push({ kind: "error", message: msg, detail, duration: 6000 }),
};
