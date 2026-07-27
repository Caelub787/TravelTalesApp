import { Linking, Platform } from 'react-native';

import type { Coords } from '@/hooks/use-live-location';

// Apple Maps on iOS (the platform's actual default), Google's cross-platform "universal"
// directions link everywhere else — it opens the Google Maps app if installed, or falls
// back to Google Maps in a browser otherwise, on both Android and web.
export function directionsUrl(coords: Coords): string {
  if (Platform.OS === 'ios') {
    return `https://maps.apple.com/?daddr=${coords.latitude},${coords.longitude}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`;
}

// Deliberately hands off to the OS's real maps app (turn-by-turn navigation, live
// rerouting) rather than opening in-app — the in-app themed viewer can't replace that.
export function openDirections(coords: Coords): void {
  Linking.openURL(directionsUrl(coords)).catch(() => {
    // Non-fatal: nothing more useful to do than silently no-op if the OS can't handle it.
  });
}
