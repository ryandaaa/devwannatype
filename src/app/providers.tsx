import { ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLayoutStore } from "../features/layout/store";
import { useSettingsStore } from "../features/settings/store";
import { seedWelcomeIfEmpty } from "../features/seed/welcome";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  const hydrate = useLayoutStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const setSelectedNoteId = useLayoutStore((s) => s.setSelectedNoteId);
  const hydrated = useLayoutStore((s) => s.hydrated);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const [seedRan, setSeedRan] = useState(false);

  useEffect(() => {
    void hydrate();
    void hydrateSettings();
  }, [hydrate, hydrateSettings]);

  useEffect(() => {
    if (!hydrated || seedRan) return;
    (async () => {
      const newId = await seedWelcomeIfEmpty();
      if (newId) {
        const current = useLayoutStore.getState().selectedNoteId;
        if (!current) {
          setSelectedNoteId(newId);
        }
      }
      setSeedRan(true);
    })();
  }, [hydrated, seedRan, setSelectedNoteId]);

  if (!hydrated || !settingsHydrated) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <span className="font-code text-body-sm text-on-surface-variant">loading…</span>
      </div>
    );
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
