import { useCallback, useRef, useState } from 'react';

import type { CategoryId } from '@/constants/categories';
import { fetchLocationFacts, fetchWikiFacts, type LocationFactsResponse } from '@/services/api';
import { useContentMode } from '@/hooks/use-content-mode';
import type { Coords } from '@/hooks/use-live-location';
import { useSearchRadius } from '@/hooks/use-search-radius';
import { distanceMeters } from '@/utils/distance';

const MOVED_THRESHOLD_METERS = 400;

export type LocationFactsStatus = 'idle' | 'loading' | 'error' | 'success';

export function useLocationFacts() {
  const { mode } = useContentMode();
  const { radiusMiles } = useSearchRadius();
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [result, setResult] = useState<LocationFactsResponse | null>(null);
  const [status, setStatus] = useState<LocationFactsStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const lastFetchedCoords = useRef<Coords | null>(null);

  const load = useCallback(
    async (nextCategory: CategoryId, coords: Coords, placeLabel: string | null) => {
      setCategory(nextCategory);
      setStatus('loading');
      setError(null);

      try {
        const request = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          placeLabel: placeLabel ?? undefined,
          category: nextCategory,
          radiusMiles,
        };
        const response = mode === 'wiki' ? await fetchWikiFacts(request) : await fetchLocationFacts(request);
        setResult(response);
        setStatus('success');
        lastFetchedCoords.current = coords;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [mode, radiusMiles]
  );

  const hasMovedSinceLastFetch = useCallback(
    (coords: Coords | null) => {
      if (!coords || !lastFetchedCoords.current) return false;
      return distanceMeters(lastFetchedCoords.current, coords) >= MOVED_THRESHOLD_METERS;
    },
    []
  );

  return { category, result, status, error, load, hasMovedSinceLastFetch };
}
