/** Debounce utility — fires fn `wait` ms after last call. */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait: number,
): T & { flush: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const wrapped = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) fn(...lastArgs);
      lastArgs = null;
    }, wait);
  }) as T & { flush: () => void; cancel: () => void };

  wrapped.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs) fn(...lastArgs);
      lastArgs = null;
    }
  };

  wrapped.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      lastArgs = null;
    }
  };

  return wrapped;
}

/** Cross-OS modifier — true if Cmd (mac) atau Ctrl (else) ditekan. */
export function isMod(e: { metaKey: boolean; ctrlKey: boolean }): boolean {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return isMac ? e.metaKey : e.ctrlKey;
}
