/**
 * useApi — lightweight hook that fetches data from the API client on mount.
 * Pass a `refreshKey` to trigger a re-fetch when the value changes.
 * Returns `{ data, loading }` where data is null when no real data exists yet.
 */
import { useState, useEffect } from 'react';

export function useApi<T>(
  fetcher: () => Promise<T | null>,
  refreshKey?: unknown,
): { data: T | null; loading: boolean } {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then(result => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return { data, loading };
}
