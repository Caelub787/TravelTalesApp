import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Coords } from '@/hooks/use-live-location';
import type { NearbyArticle } from '@/services/api';

const STORAGE_KEY = 'traveltales:offline-trips';
const ACTIVE_TRIP_KEY = 'traveltales:active-trip-id';

export interface TripStop {
  latitude: number;
  longitude: number;
  distanceAlongRouteMeters: number;
  placeLabel: string | null;
  articles: NearbyArticle[];
}

export interface Trip {
  id: string;
  name: string;
  createdAt: number;
  waypoints: Coords[];
  routeGeometry: Coords[];
  totalDistanceMeters: number;
  stops: TripStop[];
}

interface OfflineTripsContextValue {
  trips: Trip[];
  saveTrip: (trip: Trip) => void;
  deleteTrip: (id: string) => void;
  activeTripId: string | null;
  setActiveTripId: (id: string | null) => void;
}

const OfflineTripsContext = createContext<OfflineTripsContextValue | null>(null);

export function OfflineTripsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripIdState] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        setTrips(JSON.parse(stored));
      } catch {
        // Corrupt/old data — ignore and start fresh rather than crash.
      }
    });
    AsyncStorage.getItem(ACTIVE_TRIP_KEY).then((stored) => {
      if (stored) setActiveTripIdState(stored);
    });
  }, []);

  const persist = useCallback((next: Trip[]) => {
    setTrips(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Non-fatal: the trip still applies for this session even if persistence fails.
    });
  }, []);

  const saveTrip = useCallback(
    (trip: Trip) => {
      persist([trip, ...trips.filter((existing) => existing.id !== trip.id)]);
    },
    [trips, persist]
  );

  const setActiveTripId = useCallback((id: string | null) => {
    setActiveTripIdState(id);
    if (id) {
      AsyncStorage.setItem(ACTIVE_TRIP_KEY, id).catch(() => {});
    } else {
      AsyncStorage.removeItem(ACTIVE_TRIP_KEY).catch(() => {});
    }
  }, []);

  const deleteTrip = useCallback(
    (id: string) => {
      persist(trips.filter((existing) => existing.id !== id));
      if (activeTripId === id) setActiveTripId(null);
    },
    [trips, persist, activeTripId, setActiveTripId]
  );

  return (
    <OfflineTripsContext.Provider value={{ trips, saveTrip, deleteTrip, activeTripId, setActiveTripId }}>
      {children}
    </OfflineTripsContext.Provider>
  );
}

export function useOfflineTrips(): OfflineTripsContextValue {
  const context = useContext(OfflineTripsContext);
  if (!context) {
    throw new Error('useOfflineTrips must be used within an OfflineTripsProvider');
  }
  return context;
}
