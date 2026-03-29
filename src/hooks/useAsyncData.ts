/**
 * useAsyncData — eliminates the repeated useEffect + useState loading/error pattern.
 *
 * Before (every component):
 *   const [data, setData] = useState(null);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState(null);
 *   useEffect(() => { fetchData().then(setData).catch(setError).finally(() => setLoading(false)) }, []);
 *
 * After:
 *   const { data, loading, error, refetch } = useAsyncData(() => fetchData());
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Avoid state updates on unmounted components
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) setData(result);
    } catch (e: any) {
      if (mountedRef.current) {
        setError(e?.response?.data?.detail || e?.message || 'Failed to load data');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
