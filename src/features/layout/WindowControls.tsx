import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon } from "../../components/Icon";

/**
 * Custom window controls — minimize / maximize / close.
 * Tampil di pojok kanan TopAppBar saat decorations dimatikan.
 * Visual: monochrome, tanpa shadow / gradient. Tombol close di-tandai accent error
 * hanya saat hover (sesuai konvensi minimal Windows yang clean).
 */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  const win = getCurrentWindow();

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const m = await win.isMaximized();
        if (!cancelled) setMaximized(m);
      } catch {
        /* ignore */
      }
    }
    void refresh();
    const unlisten = win.onResized(() => void refresh());
    return () => {
      cancelled = true;
      void unlisten.then((fn) => fn());
    };
  }, [win]);

  return (
    <div className="flex items-center h-full">
      <CtrlButton
        label="Minimize"
        icon="remove"
        onClick={() => void win.minimize().catch(() => {})}
      />
      <CtrlButton
        label={maximized ? "Restore" : "Maximize"}
        icon={maximized ? "filter_none" : "crop_square"}
        iconSize={maximized ? 12 : 14}
        onClick={() => void win.toggleMaximize().catch(() => {})}
      />
      <CtrlButton
        label="Close"
        icon="close"
        danger
        onClick={() => void win.close().catch(() => {})}
      />
    </div>
  );
}

function CtrlButton({
  label,
  icon,
  iconSize = 16,
  onClick,
  danger,
}: {
  label: string;
  icon: string;
  iconSize?: number;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`w-[40px] h-[48px] flex items-center justify-center text-on-surface-variant transition-colors duration-100 ${
        danger
          ? "hover:bg-error-container hover:text-on-error-container"
          : "hover:bg-surface-variant hover:text-on-surface"
      }`}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
