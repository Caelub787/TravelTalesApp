import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';

import { ActiveTripView } from '@/components/active-trip-view';
import { AddressSearchInput } from '@/components/address-search-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TripList } from '@/components/trip-list';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { Coords } from '@/hooks/use-live-location';
import { useOfflineTrips, type Trip, type TripStop } from '@/hooks/use-offline-trips';
import { useTheme } from '@/hooks/use-theme';
import { useTripDownload } from '@/hooks/use-trip-download';
import { reverseGeocodeApi, type AddressSearchResult } from '@/services/api';
import { fetchRoute, type RouteResult } from '@/services/routing';
import { fixLeafletDefaultIcon } from '@/utils/leaflet-icon-fix';
import { sampleRoute } from '@/utils/route-sampling';

fixLeafletDefaultIcon();

const FALLBACK_CENTER: [number, number] = [40, -100];
const FALLBACK_ZOOM = 4;
// One stop roughly every 3 miles along the route — close enough that "everything in
// between" the pins gets covered, without ballooning download time/storage for long trips.
const SAMPLE_INTERVAL_METERS = 4828;

interface WaypointEntry {
  id: string;
  label: string;
  coords: Coords | null;
}

let entryIdCounter = 0;
function makeEntry(label = ''): WaypointEntry {
  entryIdCounter += 1;
  return { id: `entry-${entryIdCounter}`, label, coords: null };
}

function ClickHandler({ onPick }: { onPick: (coords: Coords) => void }) {
  useMapEvents({
    click(event) {
      onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function formatMiles(meters: number): string {
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

export default function TripScreenWeb() {
  const theme = useTheme();
  const { trips, activeTripId, setActiveTripId, saveTrip } = useOfflineTrips();
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

  const startPlanning = () => {
    setEntries([makeEntry(), makeEntry()]);
    setActiveEntryId(null);
    setRoute(null);
    setDownloadedStops(null);
    setTripName('');
    setMode('planning');
  };

  const cancelPlanning = () => {
    setMode('list');
  };

  const updateEntry = (id: string, changes: Partial<WaypointEntry>) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)));
  };

  const handleSelectSuggestion = (id: string, result: AddressSearchResult) => {
    updateEntry(id, { label: result.label, coords: { latitude: result.latitude, longitude: result.longitude } });
  };

  const addStop = () => {
    setEntries((prev) => {
      const next = [...prev];
      next.splice(next.length - 1, 0, makeEntry());
      return next;
    });
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => (prev.length <= 2 ? prev : prev.filter((entry) => entry.id !== id)));
  };

  const useCurrentLocationFor = async (id: string) => {
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
  };

  const handleMapPick = async (coords: Coords) => {
    const targetId = activeEntryId ?? entries.find((entry) => entry.coords === null)?.id ?? entries[entries.length - 1].id;
    updateEntry(targetId, { label: 'Locating…', coords });
    try {
      const result = await reverseGeocodeApi(coords);
      updateEntry(targetId, { label: result.label ?? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`, coords });
    } catch {
      updateEntry(targetId, { label: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`, coords });
    }
  };

  const handleDownload = async () => {
    if (!route) return;
    const samples = sampleRoute(route.geometry, SAMPLE_INTERVAL_METERS);
    const stops = await download(samples);
    setDownloadedStops(stops);
    setTripName(`Trip ${new Date().toLocaleDateString()}`);
  };

  const handleSaveTrip = () => {
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
  };

  if (activeTrip) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.activeWrapper}>
            <ActiveTripView trip={activeTrip} onStop={() => setActiveTripId(null)} />
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (mode === 'list') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Trips
              </ThemedText>
              <Pressable onPress={startPlanning} style={[styles.newTripButton, { backgroundColor: theme.accent }]}>
                <Ionicons name="add" size={16} color={theme.accentContrast} />
                <ThemedText type="smallBold" themeColor="accentContrast">
                  Plan a trip
                </ThemedText>
              </Pressable>
            </ThemedView>
            <TripList onStart={(trip) => setActiveTripId(trip.id)} />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const canDownload = allEntriesFilled && route !== null && downloadStatus !== 'downloading';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <Pressable onPress={cancelPlanning} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="title" style={styles.title}>
            Plan a trip
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.mapWrapper}>
          <MapContainer center={FALLBACK_CENTER} zoom={FALLBACK_ZOOM} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={handleMapPick} />
            {entries.map((entry, index) =>
              entry.coords ? (
                <Marker key={entry.id} position={[entry.coords.latitude, entry.coords.longitude]}>
                  <Popup>
                    {index === 0 ? 'Start' : index === entries.length - 1 ? 'End' : `Stop ${index}`}
                    {entry.label ? ` — ${entry.label}` : ''}
                  </Popup>
                </Marker>
              ) : null
            )}
            {route && (
              <Polyline
                positions={route.geometry.map((point) => [point.latitude, point.longitude])}
                pathOptions={{ color: theme.accent, weight: 4 }}
              />
            )}
          </MapContainer>
        </ThemedView>

        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText themeColor="textSecondary">
            Type an address for your start, end, and any stops along the way — or tap the map
            to drop a point instead. The actual road path between them gets downloaded, not
            just straight lines.
          </ThemedText>

          <ThemedView style={styles.entriesList}>
            {entries.map((entry, index) => {
              const isStart = index === 0;
              const isEnd = index === entries.length - 1;
              const placeholder = isStart ? 'Starting address' : isEnd ? 'Destination address' : `Stop ${index}`;
              return (
                <ThemedView
                  key={entry.id}
                  style={[styles.entryRow, { zIndex: entry.id === activeEntryId ? 30 : 1 }]}>
                  <ThemedView style={[styles.entryDot, { backgroundColor: isStart || isEnd ? theme.accent : theme.border }]} />
                  <ThemedView style={styles.entryInputWrapper}>
                    <AddressSearchInput
                      placeholder={placeholder}
                      value={entry.label}
                      onChangeText={(text) => updateEntry(entry.id, { label: text, coords: null })}
                      onSelect={(result) => handleSelectSuggestion(entry.id, result)}
                      onFocus={() => setActiveEntryId(entry.id)}
                    />
                  </ThemedView>
                  {(isStart || isEnd) && (
                    <Pressable
                      onPress={() => useCurrentLocationFor(entry.id)}
                      disabled={locatingEntryId === entry.id}
                      style={styles.locateButton}>
                      {locatingEntryId === entry.id ? (
                        <ActivityIndicator size="small" color={theme.accent} />
                      ) : (
                        <Ionicons name="locate" size={18} color={theme.accent} />
                      )}
                    </Pressable>
                  )}
                  {!isStart && !isEnd && (
                    <Pressable onPress={() => removeEntry(entry.id)} style={styles.removeButton}>
                      <Ionicons name="close" size={18} color={theme.textSecondary} />
                    </Pressable>
                  )}
                </ThemedView>
              );
            })}
          </ThemedView>

          <Pressable onPress={addStop} style={styles.addStopButton}>
            <Ionicons name="add-circle-outline" size={18} color={theme.accent} />
            <ThemedText type="linkPrimary">Add a stop</ThemedText>
          </Pressable>

          {locateError && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>Couldn't get your location: {locateError}</ThemedText>
            </ThemedView>
          )}

          <ThemedView style={styles.waypointRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {waypoints.length} of {entries.length} point{entries.length === 1 ? '' : 's'} set
              {route ? ` · ${formatMiles(route.distanceMeters)}` : ''}
            </ThemedText>
          </ThemedView>

          {routeStatus === 'loading' && (
            <ThemedView style={styles.notice}>
              <ActivityIndicator />
              <ThemedText themeColor="textSecondary">Finding the route…</ThemedText>
            </ThemedView>
          )}
          {routeStatus === 'error' && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>Couldn't find a route: {routeError}</ThemedText>
            </ThemedView>
          )}

          {downloadedStops === null ? (
            <Pressable
              onPress={handleDownload}
              disabled={!canDownload}
              style={[styles.downloadButton, { backgroundColor: theme.accent, opacity: canDownload ? 1 : 0.4 }]}>
              <Ionicons name="cloud-download-outline" size={18} color={theme.accentContrast} />
              <ThemedText type="smallBold" themeColor="accentContrast">
                Download for offline
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedView style={styles.saveRow}>
              <TextInput
                value={tripName}
                onChangeText={setTripName}
                placeholder="Name this trip"
                placeholderTextColor={theme.textSecondary}
                style={[styles.nameInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              />
              <Pressable onPress={handleSaveTrip} style={[styles.downloadButton, { backgroundColor: theme.accent }]}>
                <Ionicons name="checkmark" size={18} color={theme.accentContrast} />
                <ThemedText type="smallBold" themeColor="accentContrast">
                  Save trip
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {downloadStatus === 'downloading' && (
            <ThemedView style={styles.notice}>
              <ActivityIndicator />
              <ThemedText themeColor="textSecondary">
                Downloading stop {progress.done} of {progress.total}…
              </ThemedText>
            </ThemedView>
          )}
          {downloadStatus === 'error' && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>Download didn't fully finish: {downloadError}</ThemedText>
            </ThemedView>
          )}
          {downloadStatus === 'success' && downloadedStops && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText themeColor="textSecondary">
                Downloaded {downloadedStops.length} stop{downloadedStops.length === 1 ? '' : 's'} — name your
                trip and save it to follow offline.
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  activeWrapper: {
    flex: 1,
    width: '100%',
    padding: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  newTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    marginLeft: 'auto',
  },
  mapWrapper: {
    width: '100%',
    height: 320,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  entriesList: {
    gap: Spacing.two,
    zIndex: 5,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  entryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  entryInputWrapper: {
    flex: 1,
  },
  removeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locateButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  saveRow: {
    gap: Spacing.two,
  },
  nameInput: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
});
