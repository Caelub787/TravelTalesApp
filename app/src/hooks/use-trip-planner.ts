import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import type { Coords } from '@/hooks/use-live-location';
import { useOfflineTrips, type Trip, type TripStop } from '@/hooks/use-offline-trips';
import { useTripDownload } from '@/hooks/use-trip-download';
import { reverseGeocodeApi, type AddressSearchResult } from '@/services/api';
import { fetchRoute, type RouteResult } from '@/services/routing';
import { sampleRoute } from '@/utils/route-sampling';

// One stop roughly every 3 miles along the route — close enough that "everything in
// between" the pins gets covered, without ballooning download time/storage for long trips.
const SAMPLE_INTERVAL_METERS = 4828;

export interface WaypointEntry {
  id: string;
  label: string;
  coords: Coords | null;
}

let entryIdCounter = 0;
function makeEntry(label = ''): WaypointEntry {
  entryIdCounter += 1;
  return { id: `entry-${entryIdCounter}`, label, coords: null };
}

// Shared "plan a route, then download it for offline" logic used by both the native
// (react-native-maps) and web (Google Maps JS API) trip screens — only the map rendering
// itself differs per platform.
export function useTripPlanner() {
  const { trips, activeTripId, setActiveTripId, saveTrip, deleteTrip } = useOfflineTrips();
  const activeTrip = trips.find((trip) => trip.id === activeTripId) ?? null;

  const [mode, setMode] = useState<'list' | 'planning'>('list');
  const [entries, setEntries] = useState<WaypointEntry[]>([makeEntry(), makeEntry()]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [locatingEntryId, setLocatingEntryId] = useState<string | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeStatus, setRouteStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [downloadedStops, setDownloadedStops] = useState<TripStop[] | null>(null);
  const [tripName, setTripName] = useState('');
  const { status: downloadStatus, progress, error: downloadError, download } = useTripDownload();

  const waypoints = entries
    .map((entry) => entry.coords)
    .filter((coords): coords is Coords => coords !== null);
  const allEntriesFilled = entries.length >= 2 && entries.every((entry) => entry.coords !== null);

  useEffect(() => {
    if (!allEntriesFilled) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    setRouteStatus('loading');
    setRouteError(null);
    fetchRoute(waypoints)
      .then((result) => {
        if (!cancelled) {
          setRoute(result);
          setRouteStatus('idle');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRouteError(err instanceof Error ? err.message : String(err));
          setRouteStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEntriesFilled, JSON.stringify(waypoints)]);

  const startPlanning = useCallback(() => {
    setEntries([makeEntry(), makeEntry()]);
    setActiveEntryId(null);
    setRoute(null);
    setDownloadedStops(null);
    setTripName('');
    setMode('planning');
  }, []);

  const cancelPlanning = useCallback(() => {
    setMode('list');
  }, []);

  const updateEntry = useCallback((id: string, changes: Partial<WaypointEntry>) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)));
  }, []);

  const handleSelectSuggestion = useCallback(
    (id: string, result: AddressSearchResult) => {
      updateEntry(id, { label: result.label, coords: { latitude: result.latitude, longitude: result.longitude } });
    },
    [updateEntry]
  );

  const addStop = useCallback(() => {
    setEntries((prev) => {
      const next = [...prev];
      next.splice(next.length - 1, 0, makeEntry());
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => (prev.length <= 2 ? prev : prev.filter((entry) => entry.id !== id)));
  }, []);

  const useCurrentLocationFor = useCallback(async (id: string) => {
    setLocateError(null);
    setLocatingEntryId(id);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        throw new Error('Location permission was denied');
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.Balanced });
      const coords: Coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      updateEntry(id, { label: 'Locating…', coords });
      try {
        const result = await reverseGeocodeApi(coords);
        updateEntry(id, { label: result.label ?? 'Current location', coords });
      } catch {
        updateEntry(id, { label: 'Current location', coords });
      }
    } catch (err) {
      setLocateError(err instanceof Error ? err.message : String(err));
    } finally {
      setLocatingEntryId(null);
    }
  }, [updateEntry]);

  const handleMapPick = useCallback(
    async (coords: Coords) => {
      const targetId = activeEntryId ?? entries.find((entry) => entry.coords === null)?.id ?? entries[entries.length - 1].id;
      updateEntry(targetId, { label: 'Locating…', coords });
      try {
        const result = await reverseGeocodeApi(coords);
        updateEntry(targetId, { label: result.label ?? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`, coords });
      } catch {
        updateEntry(targetId, { label: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`, coords });
      }
    },
    [activeEntryId, entries, updateEntry]
  );

  const handleDownload = useCallback(async () => {
    if (!route) return;
    const samples = sampleRoute(route.geometry, SAMPLE_INTERVAL_METERS);
    const stops = await download(samples);
    setDownloadedStops(stops);
    setTripName(`Trip ${new Date().toLocaleDateString()}`);
  }, [route, download]);

  const handleSaveTrip = useCallback(() => {
    if (!route || !downloadedStops) return;
    const trip: Trip = {
      id: `trip-${Date.now()}`,
      name: tripName.trim() || `Trip ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      waypoints,
      routeGeometry: route.geometry,
      totalDistanceMeters: route.distanceMeters,
      stops: downloadedStops,
    };
    saveTrip(trip);
    setMode('list');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, downloadedStops, tripName, saveTrip]);

  const canDownload = allEntriesFilled && route !== null && downloadStatus !== 'downloading';

  return {
    trips,
    activeTrip,
    setActiveTripId,
    deleteTrip,
    mode,
    entries,
    activeEntryId,
    setActiveEntryId,
    locatingEntryId,
    locateError,
    route,
    routeStatus,
    routeError,
    downloadedStops,
    tripName,
    setTripName,
    waypoints,
    allEntriesFilled,
    canDownload,
    downloadStatus,
    downloadProgress: progress,
    downloadError,
    startPlanning,
    cancelPlanning,
    updateEntry,
    handleSelectSuggestion,
    addStop,
    removeEntry,
    useCurrentLocationFor,
    handleMapPick,
    handleDownload,
    handleSaveTrip,
  };
}
