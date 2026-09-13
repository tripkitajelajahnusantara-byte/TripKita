import { useEffect, useState } from 'react';
import { request } from './api';

// Keep errors distinct from empty results and discard responses for previous queries.
export function useApiData<T>(endpoint: string | null) {
  const [revision, setRevision] = useState(0);
  const key = `${endpoint}:${revision}`;
  const [result, setResult] = useState<{ key: string; data: T | null; error: string } | null>(null);
  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    request(endpoint, { signal: controller.signal }).then((data: T) => {
      if (!controller.signal.aborted) setResult({ key, data, error: '' });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({
        key, data: null, error: error instanceof Error ? error.message : 'Data gagal dimuat. Silakan coba lagi.',
      });
    });
    return () => controller.abort();
  }, [endpoint, key]);
  const current = result?.key === key ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error || '',
    loading: Boolean(endpoint) && !current,
    reload: () => setRevision(value => value + 1),
  };
}
