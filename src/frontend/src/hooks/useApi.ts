/**
 * Lightweight data-fetching hook.
 * Returns { data, loading, error } and re-fetches when `deps` change.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // stable ref so the effect doesn't re-run on fetcher identity changes
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcherRef.current()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Request failed');
        setLoading(false);
      });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [...deps, run]);

  return { data, loading, error, refetch: run };
}
