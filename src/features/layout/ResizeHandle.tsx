import { useCallback, useEffect, useRef } from "react";

interface ResizeHandleProps {
  /** "col" = drag horizontal (resize width); "row" = drag vertical (resize height). */
  direction: "col" | "row";
  /** Current size in px. */
  value: number;
  /** Min and max bounds. */
  min: number;
  max: number;
  /** Called with new value (clamped). Persistensi diserahkan ke store. */
  onChange: (v: number) => void;
  /** Resize delta direction: 1 = drag right/down increases, -1 = decreases. */
  invert?: boolean;
  className?: string;
}

/**
 * 1px hairline yang berubah jadi grab area saat hover. Tidak ada animasi.
 * Untuk col: handle vertical strip 3px lebar; for row: horizontal strip 3px tinggi.
 */
export function ResizeHandle({
  direction,
  value,
  min,
  max,
  onChange,
  invert = false,
  className = "",
}: ResizeHandleProps) {
  const startRef = useRef<{ pos: number; size: number } | null>(null);

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!startRef.current) return;
      const cur = direction === "col" ? e.clientX : e.clientY;
      const delta = cur - startRef.current.pos;
      const sign = invert ? -1 : 1;
      const next = Math.max(min, Math.min(max, startRef.current.size + sign * delta));
      onChange(next);
    },
    [direction, invert, min, max, onChange],
  );

  const onUp = useCallback(() => {
    startRef.current = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [onMove]);

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startRef.current = {
        pos: direction === "col" ? e.clientX : e.clientY,
        size: value,
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      document.body.style.cursor = direction === "col" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [direction, value, onMove, onUp],
  );

  // Cleanup listeners jika unmount selama drag
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onMove, onUp]);

  if (direction === "col") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onDown}
        className={`shrink-0 w-[3px] -mx-[1px] z-10 cursor-col-resize hover:bg-outline-variant active:bg-outline-variant transition-colors ${className}`}
      />
    );
  }
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      onMouseDown={onDown}
      className={`shrink-0 h-[3px] -my-[1px] z-10 cursor-row-resize hover:bg-outline-variant active:bg-outline-variant transition-colors ${className}`}
    />
  );
}
