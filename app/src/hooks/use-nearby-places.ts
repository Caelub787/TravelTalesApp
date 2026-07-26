import { useCallback, useState } from 'react';

import type { Coords } from '@/hooks/use-live-location';
import { useSearchRadius } from '@/hooks/use-search-radius';
import { fetchNearbyPlaces, type NearbyPlacesResponse } from '@/services/api';

export type NearbyPlacesStatus = 'idle' | 'loading' | 'error' | 'success';

// Live-only discovery of nearby destinations/lookouts/attractions via Google Places —
// unlike article browsing, this has no offline fallback, since it's a "what's around me
// right now" feature rather than something pre-downloaded for a specific route/area (trip
// stops embed their own place list directly, see use-trip-download.ts).
export function useNearbyPlaces() {
  const { radiusMiles } = useSearchRadius();
  const [result, setResult] = useState<NearbyPlacesResponse | null>(null);
  const [status, setStatus] = useState<NearbyPlacesStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchNearby = useCallback(
    async (coords: Coords) => {
      setStatus('loading');
      setError(null);
      try {
        const response = await fetchNearbyPlaces({
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
