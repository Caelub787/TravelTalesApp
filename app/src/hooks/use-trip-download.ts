import { useCallback, useState } from 'react';

import type { TripStop } from '@/hooks/use-offline-trips';
import type { RouteSample } from '@/utils/route-sampling';
import { fetchNearbyArticles } from '@/services/api';
import { reverseGeocode } from '@/utils/geocode';

export type TripDownloadStatus = 'idle' | 'downloading' | 'error' | 'success';

const STOP_RADIUS_MILES = 2;
const MAX_ARTICLES_PER_STOP = 10;

export function useTripDownload() {
  const [status, setStatus] = useState<TripDownloadStatus>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (samples: RouteSample[]): Promise<TripStop[]> => {
    setStatus('downloading');
    setError(null);
    setProgress({ done: 0, total: samples.length });

    const stops: TripStop[] = [];

    try {
      for (let i = 0; i < samples.length; i++) {
        const sample = samples[i];
        const [placeLabel, articlesResponse] = await Promise.all([
          reverseGeocode(sample).catch(() => null),
          fetchNearbyArticles({ latitude: sample.latitude, longitude: sample.longitude, radiusMiles: STOP_RADIUS_MILES }),
        ]);

        stops.push({
          latitude: sample.latitude,
          longitude: sample.longitude,
          distanceAlongRouteMeters: sample.distanceAlongRouteMeters,
          placeLabel,
          articles: articlesResponse.articles.slice(0, MAX_ARTICLES_PER_STOP),
        });
        setProgress({ done: i + 1, total: samples.length });
      }
      setStatus('success');
      return stops;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      return stops;
    }
  }, []);

  return { status, progress, error, download };
}
