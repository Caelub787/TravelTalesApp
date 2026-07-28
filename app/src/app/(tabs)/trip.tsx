import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveTripView } from '@/components/active-trip-view';
import { AddressSearchInput } from '@/components/address-search-input';
import { GoogleMapView, type MapMarker } from '@/components/google-map-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TripList } from '@/components/trip-list';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTripPlanner } from '@/hooks/use-trip-planner';

const FALLBACK_CENTER = { latitude: 40, longitude: -100 };
const FALLBACK_ZOOM = 4;

function formatMiles(meters: number): string {
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

export default function TripScreen() {
  const theme = useTheme();
  const planner = useTripPlanner();

  if (planner.activeTrip) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.activeWrapper}>
            <ActiveTripView trip={planner.activeTrip} onStop={() => planner.setActiveTripId(null)} />
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (planner.mode === 'list') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Trips
              </ThemedText>
              <Pressable onPress={planner.startPlanning} style={[styles.newTripButton, { backgroundColor: theme.accent }]}>
                <Ionicons name="add" size={16} color={theme.accentContrast} />
                <ThemedText type="smallBold" themeColor="accentContrast">
                  Plan a trip
                </ThemedText>
              </Pressable>
            </ThemedView>
            <TripList onStart={(trip) => planner.setActiveTripId(trip.id)} />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const markers: MapMarker[] = planner.entries
    .map((entry, index): MapMarker | null =>
      entry.coords
        ? {
            id: entry.id,
            coords: entry.coords,
            label:
              (index === 0 ? 'Start' : index === planner.entries.length - 1 ? 'End' : `Stop ${index}`) +
              (entry.label ? ` — ${entry.label}` : ''),
            color: index === 0 || index === planner.entries.length - 1 ? '#208AEF' : theme.accent,
          }
        : null
    )
    .filter((marker): marker is MapMarker => marker !== null);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <Pressable onPress={planner.cancelPlanning} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="title" style={styles.title}>
            Plan a trip
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.mapWrapper}>
          <GoogleMapView
            initialCenter={FALLBACK_CENTER}
            initialZoom={FALLBACK_ZOOM}
            markers={markers}
            polyline={planner.route?.geometry}
            onPress={planner.handleMapPick}
          />
        </ThemedView>

        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText themeColor="textSecondary">
            Type an address for your start, end, and any stops along the way — or tap the map
            to drop a point instead. The actual road path between them gets downloaded, not
            just straight lines.
          </ThemedText>

          <ThemedView style={styles.entriesList}>
            {planner.entries.map((entry, index) => {
              const isStart = index === 0;
              const isEnd = index === planner.entries.length - 1;
              const placeholder = isStart ? 'Starting address' : isEnd ? 'Destination address' : `Stop ${index}`;
              return (
                <ThemedView
                  key={entry.id}
                  style={[styles.entryRow, { zIndex: entry.id === planner.activeEntryId ? 30 : 1 }]}>
                  <ThemedView style={[styles.entryDot, { backgroundColor: isStart || isEnd ? theme.accent : theme.border }]} />
                  <ThemedView style={styles.entryInputWrapper}>
                    <AddressSearchInput
                      placeholder={placeholder}
                      value={entry.label}
                      onChangeText={(text) => planner.updateEntry(entry.id, { label: text, coords: null })}
                      onSelect={(result) => planner.handleSelectSuggestion(entry.id, result)}
                      onFocus={() => planner.setActiveEntryId(entry.id)}
                    />
                  </ThemedView>
                  {(isStart || isEnd) && (
                    <Pressable
                      onPress={() => planner.useCurrentLocationFor(entry.id)}
                      disabled={planner.locatingEntryId === entry.id}
                      style={styles.locateButton}>
                      {planner.locatingEntryId === entry.id ? (
                        <ActivityIndicator size="small" color={theme.accent} />
                      ) : (
                        <Ionicons name="locate" size={18} color={theme.accent} />
                      )}
                    </Pressable>
                  )}
                  {!isStart && !isEnd && (
                    <Pressable onPress={() => planner.removeEntry(entry.id)} style={styles.removeButton}>
                      <Ionicons name="close" size={18} color={theme.textSecondary} />
                    </Pressable>
                  )}
                </ThemedView>
              );
            })}
          </ThemedView>

          <Pressable onPress={planner.addStop} style={styles.addStopButton}>
            <Ionicons name="add-circle-outline" size={18} color={theme.accent} />
            <ThemedText type="linkPrimary">Add a stop</ThemedText>
          </Pressable>

          {planner.locateError && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>Couldn't get your location: {planner.locateError}</ThemedText>
            </ThemedView>
          )}

          <ThemedView style={styles.waypointRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {planner.waypoints.length} of {planner.entries.length} point{planner.entries.length === 1 ? '' : 's'} set
              {planner.route ? ` · ${formatMiles(planner.route.distanceMeters)}` : ''}
            </ThemedText>
          </ThemedView>

          {planner.routeStatus === 'loading' && (
            <ThemedView style={styles.notice}>
              <ActivityIndicator />
              <ThemedText themeColor="textSecondary">Finding the route…</ThemedText>
            </ThemedView>
          )}
          {planner.routeStatus === 'error' && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>Couldn't find a route: {planner.routeError}</ThemedText>
            </ThemedView>
          )}

          {planner.downloadedStops === null ? (
            <Pressable
              onPress={planner.handleDownload}
              disabled={!planner.canDownload}
              style={[styles.downloadButton, { backgroundColor: theme.accent, opacity: planner.canDownload ? 1 : 0.4 }]}>
              <Ionicons name="cloud-download-outline" size={18} color={theme.accentContrast} />
              <ThemedText type="smallBold" themeColor="accentContrast">
                Download for offline
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedView style={styles.saveRow}>
              <TextInput
                value={planner.tripName}
                onChangeText={planner.setTripName}
                placeholder="Name this trip"
                placeholderTextColor={theme.textSecondary}
                style={[styles.nameInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              />
              <Pressable onPress={planner.handleSaveTrip} style={[styles.downloadButton, { backgroundColor: theme.accent }]}>
                <Ionicons name="checkmark" size={18} color={theme.accentContrast} />
                <ThemedText type="smallBold" themeColor="accentContrast">
                  Save trip
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {planner.downloadStatus === 'downloading' && (
            <ThemedView style={styles.notice}>
              <ActivityIndicator />
              <ThemedText themeColor="textSecondary">
                Downloading stop {planner.downloadProgress.done} of {planner.downloadProgress.total}… fetching
                articles and writing a custom AI story for each — deliberately paced (and slows down
                further if needed) so every stop gets its data; long trips can take a few minutes.
              </ThemedText>
            </ThemedView>
          )}
          {planner.downloadStatus === 'error' && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>Download didn't fully finish: {planner.downloadError}</ThemedText>
            </ThemedView>
          )}
          {planner.downloadStatus === 'success' && planner.downloadedStops && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText themeColor="textSecondary">
                Downloaded {planner.downloadedStops.length} stop{planner.downloadedStops.length === 1 ? '' : 's'} — name
                your trip and save it to follow offline.
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
