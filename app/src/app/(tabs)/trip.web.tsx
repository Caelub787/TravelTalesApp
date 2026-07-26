import { Ionicons } from '@expo/vector-icons';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';

import { ActiveTripView } from '@/components/active-trip-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TripList } from '@/components/trip-list';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { Coords } from '@/hooks/use-live-location';
import { useOfflineTrips, type Trip, type TripStop } from '@/hooks/use-offline-trips';
import { useTheme } from '@/hooks/use-theme';
import { useTripDownload } from '@/hooks/use-trip-download';
import { fetchRoute, type RouteResult } from '@/services/routing';
import { fixLeafletDefaultIcon } from '@/utils/leaflet-icon-fix';
import { sampleRoute } from '@/utils/route-sampling';

fixLeafletDefaultIcon();

const FALLBACK_CENTER: [number, number] = [40, -100];
const FALLBACK_ZOOM = 4;
// One stop roughly every 3 miles along the route — close enough that "everything in
// between" the pins gets covered, without ballooning download time/storage for long trips.
const SAMPLE_INTERVAL_METERS = 4828;

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
  const [waypoints, setWaypoints] = useState<Coords[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeStatus, setRouteStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [downloadedStops, setDownloadedStops] = useState<TripStop[] | null>(null);
  const [tripName, setTripName] = useState('');
  const { status: downloadStatus, progress, error: downloadError, download } = useTripDownload();

  useEffect(() => {
    if (waypoints.length < 2) {
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
  }, [waypoints]);

  const startPlanning = () => {
    setWaypoints([]);
    setRoute(null);
    setDownloadedStops(null);
    setTripName('');
    setMode('planning');
  };

  const cancelPlanning = () => {
    setMode('list');
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

  const canDownload = waypoints.length >= 2 && route !== null && downloadStatus !== 'downloading';

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
            <ClickHandler onPick={(coords) => setWaypoints((prev) => [...prev, coords])} />
            {waypoints.map((point, index) => (
              <Marker key={index} position={[point.latitude, point.longitude]}>
                <Popup>
                  {index === 0 ? 'Start' : index === waypoints.length - 1 ? 'End' : `Stop ${index + 1}`}
                </Popup>
              </Marker>
            ))}
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
            Tap the map to drop points along your route — start, any stops along the way, and
            the end. The actual road path between them gets downloaded, not just straight
            lines.
          </ThemedText>

          <ThemedView style={styles.waypointRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {waypoints.length} point{waypoints.length === 1 ? '' : 's'}
              {route ? ` · ${formatMiles(route.distanceMeters)}` : ''}
            </ThemedText>
            {waypoints.length > 0 && (
              <Pressable onPress={() => setWaypoints((prev) => prev.slice(0, -1))}>
                <ThemedText type="linkPrimary">Undo last point</ThemedText>
              </Pressable>
            )}
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
