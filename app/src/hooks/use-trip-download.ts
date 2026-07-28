import { useCallback, useState } from 'react';

import type { TripStop } from '@/hooks/use-offline-trips';
import { DOWNLOAD_CHANNEL_ID, dismissNotification, presentNotification, requestNotificationPermission } from '@/services/notifications';
import type { RouteSample } from '@/utils/route-sampling';
import { fetchLocationFacts, fetchNearbyArticles, fetchNearbyPlaces } from '@/services/api';
import { reverseGeocode } from '@/utils/geocode';

export type TripDownloadStatus = 'idle' | 'downloading' | 'error' | 'success';

const STOP_RADIUS_MILES = 2;
const MAX_ARTICLES_PER_STOP = 10;
// A full AI story (Wikipedia + live web search + an LLM generation, same as Story Mode)
// costs several seconds per call — generating one for every ~3-mile sample would turn a
// long trip's download into a multi-hour job for little added value (consecutive 3-mile
// samples along open highway are rarely distinct enough to need their own narrative).
// Every 4th sampled stop (~12 miles apart) still gets one; every stop still gets its
// (much cheaper) Wikipedia articles and nearby places at full density.
const STORY_SAMPLE_STRIDE = 4;
// A long trip can sample 100+ stops, each firing a couple of Wikipedia requests back to
// back. Pace between stops, and if one gets rate-limited, back off harder (and keep that
// slower pace for the rest of the download, not just the one stop) rather than easing back
// up — the goal here is "every stop eventually gets its data", not raw speed.
const BASE_STOP_DELAY_MS = 500;
const MAX_STOP_DELAY_MS = 8000;
// Retried per stop (on top of the backend's own retry-with-backoff for a single Wikipedia
// call) so a stop only ends up empty after repeated, sustained failure — not one blip.
const MAX_ATTEMPTS_PER_STOP = 5;
// Updating a system notification is cheap but still a real OS call — no need to do it every
// single stop on a 100+-stop trip.
const PROGRESS_NOTIFY_STRIDE = 5;

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

    const notificationId = `trip-download-${Date.now()}`;
    const notifyEnabled = await requestNotificationPermission().catch(() => false);
    const updateProgressNotification = (done: number, total: number) =>
      notifyEnabled
        ? presentNotification({
            identifier: notificationId,
            title: 'Downloading trip…',
            body: `${done} of ${total} stops downloaded`,
            channelId: DOWNLOAD_CHANNEL_ID,
          }).catch(() => {})
        : Promise.resolve();

    if (notifyEnabled) await updateProgressNotification(0, samples.length);

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
      // Wikipedia articles above — attempted once per stop (story only every Nth, see
      // STORY_SAMPLE_STRIDE), best-effort. A failure here (no Places key configured, AI
      // quota hit, timeout, etc.) doesn't count against the stop or trigger the same
      // retry/backoff, since re-hammering a slow/rate-limited AI call across a 100-stop
      // trip would make things worse, not better; the stop just ends up with articles
      // only, same as before this feature existed.
      const shouldGenerateStory = i % STORY_SAMPLE_STRIDE === 0;
      const [places, story] = await Promise.all([
        fetchNearbyPlaces({ latitude: sample.latitude, longitude: sample.longitude, radiusMiles: STOP_RADIUS_MILES })
          .then((response) => response.places)
          .catch(() => []),
        shouldGenerateStory
          ? fetchLocationFacts({
              latitude: sample.latitude,
              longitude: sample.longitude,
              placeLabel: placeLabel ?? undefined,
              category: 'general',
              radiusMiles: STOP_RADIUS_MILES,
            })
              .then((response) => (response.noVerifiedFactsFound ? null : response))
              .catch(() => null)
          : Promise.resolve(null),
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
      if ((i + 1) % PROGRESS_NOTIFY_STRIDE === 0 || i === samples.length - 1) {
        await updateProgressNotification(i + 1, samples.length);
      }

      if (i < samples.length - 1) {
        await sleep(delayMs);
      }
    }

    if (notifyEnabled) {
      await dismissNotification(notificationId);
      await presentNotification({
        identifier: `${notificationId}-done`,
        title: failedStops > 0 ? 'Trip download finished with some gaps' : 'Trip downloaded',
        body:
          failedStops > 0
            ? `${samples.length - failedStops} of ${samples.length} stops ready offline`
            : `${samples.length} stop${samples.length === 1 ? '' : 's'} ready offline`,
        channelId: DOWNLOAD_CHANNEL_ID,
      }).catch(() => {});
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
