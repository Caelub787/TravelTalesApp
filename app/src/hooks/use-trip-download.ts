import { useCallback, useState } from 'react';

import type { TripStop } from '@/hooks/use-offline-trips';
import type { RouteSample } from '@/utils/route-sampling';
import { fetchLocationFacts, fetchNearbyArticles, fetchNearbyPlaces } from '@/services/api';
import { reverseGeocode } from '@/utils/geocode';

export type TripDownloadStatus = 'idle' | 'downloading' | 'error' | 'success';

const STOP_RADIUS_MILES = 2;
const MAX_ARTICLES_PER_STOP = 10;
// A long trip can sample 100+ stops, each firing a couple of Wikipedia requests back to
// back. Pace between stops, and if one gets rate-limited, back off harder (and keep that
// slower pace for the rest of the download, not just the one stop) rather than easing back
// up — the goal here is "every stop eventually gets its data", not raw speed.
const BASE_STOP_DELAY_MS = 500;
const MAX_STOP_DELAY_MS = 8000;
// Retried per stop (on top of the backend's own retry-with-backoff for a single Wikipedia
// call) so a stop only ends up empty after repeated, sustained failure — not one blip.
const MAX_ATTEMPTS_PER_STOP = 5;

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
    let delayMs = BASE_STOP_DELAY_MS;

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      let placeLabel: string | null = null;
      let articles: TripStop['articles'] = [];
      let stopSucceeded = false;

      for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_STOP && !stopSucceeded; attempt++) {
        if (attempt > 0) {
          // Hit a failure — slow down harder before retrying this stop, and keep that
          // slower pace going forward so the rest of the trip doesn't re-trigger it.
          delayMs = Math.min(delayMs * 2, MAX_STOP_DELAY_MS);
          await sleep(delayMs);
        }
        try {
          const [label, articlesResponse] = await Promise.all([
            reverseGeocode(sample).catch(() => null),
            fetchNearbyArticles({ latitude: sample.latitude, longitude: sample.longitude, radiusMiles: STOP_RADIUS_MILES }),
          ]);
          placeLabel = label;
          articles = articlesResponse.articles.slice(0, MAX_ARTICLES_PER_STOP);
          stopSucceeded = true;
        } catch (err) {
          lastStopError = err instanceof Error ? err.message : String(err);
        }
      }

      if (!stopSucceeded) failedStops += 1;

      // Places (Google Places) and the AI-written story are enrichments on top of the core
      // Wikipedia articles above — attempted once per stop, best-effort. A failure here
      // (no Places key configured, AI quota hit, etc.) doesn't count against the stop or
      // trigger the same retry/backoff, since re-hammering an AI rate limit across a
      // 100-stop trip would make things worse, not better; the stop just ends up with
      // articles only, same as before this feature existed.
      const [places, story] = await Promise.all([
        fetchNearbyPlaces({ latitude: sample.latitude, longitude: sample.longitude, radiusMiles: STOP_RADIUS_MILES })
          .then((response) => response.places)
          .catch(() => []),
        fetchLocationFacts({
          latitude: sample.latitude,
          longitude: sample.longitude,
          placeLabel: placeLabel ?? undefined,
          category: 'general',
          radiusMiles: STOP_RADIUS_MILES,
        })
          .then((response) => (response.noVerifiedFactsFound ? null : response))
          .catch(() => null),
      ]);

      stops.push({
        latitude: sample.latitude,
        longitude: sample.longitude,
        distanceAlongRouteMeters: sample.distanceAlongRouteMeters,
        placeLabel,
        articles,
        places,
        story,
      });
      setProgress({ done: i + 1, total: samples.length });

      if (i < samples.length - 1) {
        await sleep(delayMs);
      }
    }

    if (failedStops > 0) {
      setError(
        `${failedStops} of ${samples.length} stop${samples.length === 1 ? '' : 's'} still came back empty after several retries (${lastStopError}). The trip is still saved — download it again later to fill in the gaps.`
      );
      setStatus('error');
    } else {
      setStatus('success');
    }
    return stops;
  }, []);

  return { status, progress, error, download };
}
