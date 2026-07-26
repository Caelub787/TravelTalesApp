import { useCallback, useState } from 'react';

import type { TripStop } from '@/hooks/use-offline-trips';
import type { RouteSample } from '@/utils/route-sampling';
import { fetchNearbyArticles } from '@/services/api';
import { reverseGeocode } from '@/utils/geocode';

export type TripDownloadStatus = 'idle' | 'downloading' | 'error' | 'success';

const STOP_RADIUS_MILES = 2;
const MAX_ARTICLES_PER_STOP = 10;
// A long trip can sample 100+ stops, each firing a couple of Wikipedia requests back to
// back — pacing them out keeps the whole download well clear of Wikipedia's rate limit
// (which the backend also retries through on a per-request basis) instead of hitting it.
const STOP_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useTripDownload() {
  const [status, setStatus] = useState<TripDownloadStatus>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (samples: RouteSample[]): Promise<TripStop[]> => {
    setStatus('downloading');
    setError(null);
    setProgress({ done: 0, total: samples.length });

    const stops: TripStop[] = [];
    let failedStops = 0;
    let lastStopError: string | null = null;

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      let placeLabel: string | null = null;
      let articles: TripStop['articles'] = [];

      // One stop's request failing (rate limit, flaky network) shouldn't sink the other
      // 99 — record it as an empty stop and keep going rather than aborting the loop.
      try {
        const [label, articlesResponse] = await Promise.all([
          reverseGeocode(sample).catch(() => null),
          fetchNearbyArticles({ latitude: sample.latitude, longitude: sample.longitude, radiusMiles: STOP_RADIUS_MILES }),
        ]);
        placeLabel = label;
        articles = articlesResponse.articles.slice(0, MAX_ARTICLES_PER_STOP);
      } catch (err) {
        failedStops += 1;
        lastStopError = err instanceof Error ? err.message : String(err);
      }

      stops.push({
        latitude: sample.latitude,
        longitude: sample.longitude,
        distanceAlongRouteMeters: sample.distanceAlongRouteMeters,
        placeLabel,
        articles,
      });
      setProgress({ done: i + 1, total: samples.length });

      if (i < samples.length - 1) {
        await sleep(STOP_DELAY_MS);
      }
    }

    if (failedStops > 0) {
      setError(
        `${failedStops} of ${samples.length} stop${samples.length === 1 ? '' : 's'} came back empty (${lastStopError}). The trip is still saved — you can download again later to fill in the gaps.`
      );
      setStatus('error');
    } else {
      setStatus('success');
    }
    return stops;
  }, []);

  return { status, progress, error, download };
}
