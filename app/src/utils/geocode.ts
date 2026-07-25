import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { Coords } from '@/hooks/use-live-location';
import { reverseGeocodeApi } from '@/services/api';

export function formatPlaceLabel(address: Location.LocationGeocodedAddress): string {
  return [address.city ?? address.subregion, address.region].filter(Boolean).join(', ') || 'Unknown area';
}

// expo-location's native reverse geocoder has no web implementation, so the
// website falls back to a backend proxy (OpenStreetMap Nominatim) instead.
export async function reverseGeocode(coords: Coords): Promise<string | null> {
  if (Platform.OS === 'web') {
    const { label } = await reverseGeocodeApi(coords);
    return label;
  }

  const results = await Location.reverseGeocodeAsync(coords);
  if (results.length === 0) return null;
  return formatPlaceLabel(results[0]);
}
