import { CSSProperties } from "react";

export interface IconProps {
  name: string;
  size?: number;
  fill?: 0 | 1;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

/**
 * Material Symbols Outlined icon.
 * Selalu render via <span class="material-symbols-outlined"> sesuai mockup.
 */
export function Icon({
  name,
  size = 18,
  fill = 0,
  weight = 400,
  className = "",
  style,
  ariaLabel,
}: IconProps) {
  return (
    <span
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: `"FILL" ${fill}, "wght" ${weight}, "GRAD" 0, "opsz" 24`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
