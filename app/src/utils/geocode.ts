import * as Location from 'expo-location';

import type { Coords } from '@/hooks/use-live-location';

export function formatPlaceLabel(address: Location.LocationGeocodedAddress): string {
  return [address.city ?? address.subregion, address.region].filter(Boolean).join(', ') || 'Unknown area';
}

export async function reverseGeocode(coords: Coords): Promise<string | null> {
  const results = await Location.reverseGeocodeAsync(coords);
  if (results.length === 0) return null;
  return formatPlaceLabel(results[0]);
}
