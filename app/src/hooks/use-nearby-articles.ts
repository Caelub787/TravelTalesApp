import { useCallback, useState } from 'react';

import { fetchNearbyArticles, type NearbyArticlesResponse } from '@/services/api';
import type { Coords } from '@/hooks/use-live-location';
import { useOfflineAreas } from '@/hooks/use-offline-areas';
import { useOfflineTrips } from '@/hooks/use-offline-trips';
import { useSearchRadius } from '@/hooks/use-search-radius';
import { findOfflineMatch } from '@/utils/offline-lookup';

export type NearbyArticlesStatus = 'idle' | 'loading' | 'error' | 'success';

export function useNearbyArticles() {
  const { radiusMiles } = useSearchRadius();
  const { areas } = useOfflineAreas();
  const { trips } = useOfflineTrips();
  const [result, setResult] = useState<NearbyArticlesResponse | null>(null);
  const [status, setStatus] = useState<NearbyArticlesStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchNearby = useCallback(
    async (coords: Coords, placeLabel?: string | null) => {
      setStatus('loading');
      setError(null);
      setIsOffline(false);

      try {
        const response = await fetchNearbyArticles({
          latitude: coords.latitude,
          longitude: coords.longitude,
          radiusMiles,
          placeLabel: placeLabel ?? undefined,
        });
        setResult(response);
        setStatus('success');
      } catch (err) {
        const offlineMatch = findOfflineMatch(coords, areas, trips);
        if (offlineMatch && offlineMatch.articles.length > 0) {
          setResult({ locationLabel: offlineMatch.placeLabel ?? 'Downloaded area', articles: offlineMatch.articles });
          setIsOffline(true);
          setStatus('success');
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [radiusMiles, areas, trips]
  );

  return { result, status, error, isOffline, fetchNearby };
}
