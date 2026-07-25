import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import { distanceMeters } from '@/utils/distance';
import { reverseGeocode } from '@/utils/geocode';

const REVERSE_GEOCODE_MIN_DISTANCE_METERS = 150;

export type LocationPermissionState = 'checking' | 'granted' | 'denied';

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface LiveLocationState {
  permission: LocationPermissionState;
  coords: Coords | null;
  placeLabel: string | null;
  error: string | null;
}

export function useLiveLocation(): LiveLocationState {
  const [permission, setPermission] = useState<LocationPermissionState>('checking');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastGeocodedCoords = useRef<Coords | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function start() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== Location.PermissionStatus.GRANTED) {
        setPermission('denied');
        return;
      }
      setPermission('granted');

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.LocationAccuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 25,
        },
        (location) => {
          if (cancelled) return;
          const next = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          setCoords(next);

          const shouldReverseGeocode =
            !lastGeocodedCoords.current ||
            distanceMeters(lastGeocodedCoords.current, next) >= REVERSE_GEOCODE_MIN_DISTANCE_METERS;

          if (shouldReverseGeocode) {
            lastGeocodedCoords.current = next;
            reverseGeocode(next)
              .then((label) => {
                if (cancelled || !label) return;
                setPlaceLabel(label);
              })
              .catch(() => {
                // Non-fatal: place label is a convenience, coords remain usable.
              });
          }
        },
        (reason) => {
          if (!cancelled) setError(reason);
        }
      );
    }

    start().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : String(err));
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return { permission, coords, placeLabel, error };
}
