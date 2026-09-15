/**
 * DataRefreshContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a single `refreshKey` counter that increments whenever a CSV import
 * completes successfully.  Every page passes this key to useApi() so that all
 * data hooks re-fetch automatically after a new import — no page reload needed.
 *
 * Usage:
 *   const { refreshKey, triggerRefresh } = useDataRefresh();
 *   const { data } = useApi(fetchKpi, refreshKey);   // re-fetches on new import
 *
 *   // In DataCenter after successful import:
 *   triggerRefresh();
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface DataRefreshContextValue {
  refreshKey:     number;
  triggerRefresh: () => void;
}

const DataRefreshContext = createContext<DataRefreshContextValue>({
  refreshKey:     0,
  triggerRefresh: () => {},
});

export function DataRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <DataRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </DataRefreshContext.Provider>
  );
}

export function useDataRefresh(): DataRefreshContextValue {
  return useContext(DataRefreshContext);
}
