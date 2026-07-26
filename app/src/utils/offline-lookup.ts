import type { Coords } from '@/hooks/use-live-location';
import type { OfflineArea } from '@/hooks/use-offline-areas';
import type { Trip } from '@/hooks/use-offline-trips';
import type { NearbyArticle } from '@/services/api';
import { distanceMeters } from '@/utils/distance';

const MILES_TO_METERS = 1609.34;
// Matches the radius used when downloading each trip stop (see use-trip-download.ts) —
// trip stops aren't tagged with their own radius, so this is the implied coverage.
const TRIP_STOP_RADIUS_MILES = 2;

export interface OfflineMatch {
  articles: NearbyArticle[];
  placeLabel: string | null;
}

// Used when a live network request fails: checks whatever's already downloaded (an area
// downloaded on purpose, or incidentally a stop from a saved trip) for coverage of the
// given position, so browsing/search can keep working with no connection.
export function findOfflineMatch(coords: Coords, areas: OfflineArea[], trips: Trip[]): OfflineMatch | null {
  for (const area of areas) {
    if (distanceMeters(coords, area.center) <= area.radiusMiles * MILES_TO_METERS) {
      return { articles: area.articles, placeLabel: area.placeLabel };
    }
  }

  for (const trip of trips) {
    for (const stop of trip.stops) {
      if (distanceMeters(coords, stop) <= TRIP_STOP_RADIUS_MILES * MILES_TO_METERS) {
        return { articles: stop.articles, placeLabel: stop.placeLabel };
      }
    }
  }

  return null;
}
