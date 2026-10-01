import { useEffect, useRef, useCallback, useState } from 'react';

export function usePolling(fetchFn, intervalMs = 10000, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const savedFn = useRef(fetchFn);

  useEffect(() => {
    savedFn.current = fetchFn;
  }, [fetchFn]);

  const execute = useCallback(async () => {
    try {
      const result = await savedFn.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    execute();
    const id = setInterval(execute, intervalMs);
    return () => clearInterval(id);
  }, [execute, intervalMs, enabled]);

  return { data, loading, error, refetch: execute };
}
