/**
 * useApi — lightweight hook that fetches data from the API client on mount.
 * Initial state is always the mock fallback so the UI renders immediately.
 * When the API responds the state updates live; if the API fails the mock persists.
 */
import { useState, useEffect } from 'react';

export function useApi<T>(
  fetcher: () => Promise<T>,
  initial: T,
): { data: T; loading: boolean } {
  const [data, setData]       = useState<T>(initial);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then(result => { if (!cancelled) setData(result); })
      .catch(() => {/* mock already set as initial */})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading };
}
