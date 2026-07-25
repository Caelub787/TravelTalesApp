import { useCallback, useState } from 'react';

import { fetchNearbyArticles, type NearbyArticlesResponse } from '@/services/api';
import type { Coords } from '@/hooks/use-live-location';
import { useSearchRadius } from '@/hooks/use-search-radius';

export type NearbyArticlesStatus = 'idle' | 'loading' | 'error' | 'success';

export function useNearbyArticles() {
  const { radiusMiles } = useSearchRadius();
  const [result, setResult] = useState<NearbyArticlesResponse | null>(null);
  const [status, setStatus] = useState<NearbyArticlesStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchNearby = useCallback(
    async (coords: Coords) => {
      setStatus('loading');
      setError(null);

      try {
        const response = await fetchNearbyArticles({
          latitude: coords.latitude,
          longitude: coords.longitude,
          radiusMiles,
        });
        setResult(response);
        setStatus('success');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [radiusMiles]
  );

  return { result, status, error, fetchNearby };
}
