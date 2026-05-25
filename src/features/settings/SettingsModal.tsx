import { useEffect, useState } from "react";
import { appDataDir } from "@tauri-apps/api/path";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Icon } from "../../components/Icon";
import { Overlay } from "../../components/Overlay";
import { useSettingsStore, type Theme } from "./store";
import { useWorkspaceStats } from "./useWorkspaceStats";
import { formatDateTime } from "../../lib/date";
import { exportAllNotes } from "../importexport";
import { toast } from "../../components/toast/toastStore";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const autosaveDelay = useSettingsStore((s) => s.autosaveDelay);
  const setAutosaveDelay = useSettingsStore((s) => s.setAutosaveDelay);
  const [vaultPath, setVaultPath] = useState<string>("");

  const stats = useWorkspaceStats();

  useEffect(() => {
    if (!open) return;
    appDataDir()
      .then(setVaultPath)
      .catch(() => setVaultPath(""));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Overlay open={open} onBackdropClick={onClose} position="top" topOffset="8vh" ariaLabel="Settings">
      <div className="w-[640px] max-w-[92vw] max-h-[85vh] flex flex-col bg-surface-container-low border border-surface-container-high">
        <div className="flex items-center justify-between px-md h-[44px] border-b border-surface-container-high shrink-0">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Settings
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-md py-md flex flex-col gap-lg">
          <Section title="Appearance">
            <div className="flex flex-col gap-xs py-xs">
              <span className="font-code text-body-sm text-on-surface">Theme</span>
              <ThemeToggle value={theme} onChange={setTheme} />
            </div>
          </Section>

          <Section title="Editor">
            <Row label="Autosave delay">
              <SelectChip
                value={String(autosaveDelay)}
                options={[
                  { value: "200", label: "200ms" },
                  { value: "400", label: "400ms" },
                  { value: "800", label: "800ms" },
                  { value: "1500", label: "1.5s" },
                ]}
                onChange={(v) => setAutosaveDelay(Number(v))}
              />
            </Row>
          </Section>

          <Section title="Storage">
            <Row label="Vault location">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(vaultPath).catch(() => {})}
                title={vaultPath || "loading…"}
                className="font-code text-body-sm text-on-surface-variant hover:text-on-surface transition-colors max-w-[400px] truncate text-right"
              >
                {vaultPath || "loading…"}
              </button>
            </Row>
            <Row label="Export workspace">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await exportAllNotes();
                    if (!res) return;
                    toast.success(
                      `exported ${res.written} ${res.written === 1 ? "note" : "notes"}` +
                        (res.skipped > 0 ? ` (${res.skipped} skipped)` : ""),
                      res.folder,
                    );
                  } catch (e) {
                    toast.error("Export workspace failed", String(e));
                  }
                }}
                className="px-sm py-xs border border-surface-container-high hover:border-outline-variant font-code text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
              >
                export all to folder…
              </button>
            </Row>
          </Section>

          <Section title="Workspace">
            {stats.isLoading ? (
              <div className="font-code text-body-sm text-on-surface-variant opacity-70">
                loading…
              </div>
            ) : stats.data ? (
              <StatsGrid data={stats.data} />
            ) : (
              <div className="font-code text-body-sm text-on-surface-variant opacity-70">
                no data
              </div>
            )}
          </Section>

          <Section title="About">
            <Row label="Version">
              <span className="font-code text-body-sm text-on-surface-variant">1.0.0</span>
            </Row>
            <Row label="Build">
              <span className="font-code text-body-sm text-on-surface-variant">stable</span>
            </Row>
            <div className="pt-md mt-sm border-t border-surface-container-high">
              <p className="font-code text-body-sm text-on-surface-variant leading-relaxed">
                made by{" "}
                <button
                  type="button"
                  onClick={() => {
                    void openUrl("https://github.com/ryandaaa").catch(() => {});
                  }}
                  className="text-on-surface underline decoration-outline-variant hover:decoration-on-surface transition-colors"
                >
                  ryandaaa
                </button>{" "}
                — available at{" "}
                <button
                  type="button"
                  onClick={() => {
                    void openUrl("https://github.com/ryandaaa").catch(() => {});
                  }}
                  className="text-on-surface underline decoration-outline-variant hover:decoration-on-surface transition-colors inline-flex items-center gap-xs"
                >
                  <Icon name="open_in_new" size={11} />
                  github
                </button>
              </p>
            </div>
          </Section>
        </div>
      </div>
    </Overlay>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <div className="font-code text-[10px] text-on-surface-variant uppercase tracking-wider mb-sm opacity-80">
        {title}
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-xs gap-md">
      <span className="font-code text-body-sm text-on-surface">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function ThemeToggle({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (t: Theme) => void;
}) {
  const opts: { value: Theme; label: string }[] = [
    { value: "dark", label: "dark" },
    { value: "light", label: "light" },
    { value: "pink", label: "pink" },
    { value: "rose-pine", label: "rose-pine" },
    { value: "solarized-light", label: "solarized" },
    { value: "nord", label: "nord" },
  ];
  return (
    <div className="grid grid-cols-3 gap-0 border border-surface-container-high">
      {opts.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`px-sm py-xs font-code text-body-sm transition-colors border-r border-b border-surface-container-high last:border-r-0 ${
            value === t.value
              ? "bg-surface-variant text-on-surface"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function SelectChip({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none px-sm py-xs pr-[24px] border border-surface-container-high bg-background hover:border-outline-variant focus:border-outline-variant focus:outline-none rounded-none font-code text-body-sm text-on-surface-variant cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface-container-low">
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="material-symbols-outlined absolute right-xs top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
        style={{ fontSize: "14px" }}
      >
        expand_more
      </span>
    </div>
  );
}

function StatsGrid({ data }: { data: import("./useWorkspaceStats").WorkspaceStats }) {
  return (
    <div className="grid grid-cols-2 gap-md font-code text-body-sm">
      <Stat label="total notes" value={String(data.total)} />
      <Stat label="active (inbox)" value={String(data.inbox)} />
      <Stat label="pinned" value={String(data.pinned)} />
      <Stat label="archived" value={String(data.archived)} />
      <Stat label="trashed" value={String(data.trashed)} />
      <Stat label="tags" value={String(data.totalTags)} />
      <Stat label="words" value={String(data.totalWords)} />
      <Stat label="characters" value={String(data.totalChars)} />
      <Stat label="markdown" value={String(data.byType.markdown)} />
      <Stat label="snippet" value={String(data.byType.snippet)} />
      <Stat label="command" value={String(data.byType.command)} />
      <Stat
        label="last activity"
        value={data.newestUpdated ? formatDateTime(data.newestUpdated) : "—"}
      />
      {data.byLanguage.length > 0 && (
        <div className="col-span-2 mt-sm">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-xs">
            languages
          </div>
          <div className="flex flex-wrap gap-xs">
            {data.byLanguage.slice(0, 10).map((l) => (
              <span
                key={l.language}
                className="inline-flex items-center gap-xs px-xs py-[2px] border border-surface-container-high font-code text-[10px] text-on-surface-variant"
              >
                {l.language} <span className="opacity-60">{l.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-surface-container-high py-xs">
      <span className="text-on-surface-variant text-[11px]">{label}</span>
      <span className="text-on-surface">{value}</span>
    </div>
  );
}
