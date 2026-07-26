import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMapView, type GoogleMapViewHandle, type MapMarker } from '@/components/google-map-view';
import { LocationExplorer } from '@/components/location-explorer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useMapPicker } from '@/hooks/use-map-picker';
import { useTheme } from '@/hooks/use-theme';

const FALLBACK_CENTER = { latitude: 40, longitude: -100 };
const FALLBACK_ZOOM = 4;
const LOCATED_ZOOM = 14;

export default function MapScreenNative() {
  const theme = useTheme();
  const { coords, pin, pinLabel, geocoding, category, result, status, factsError, handlePick, handleSelectCategory } =
    useMapPicker();
  const mapRef = useRef<GoogleMapViewHandle | null>(null);

  const handleCenterOnMe = () => {
    if (coords) mapRef.current?.centerOn(coords, LOCATED_ZOOM);
  };

  const markers: MapMarker[] = [];
  if (coords) markers.push({ id: 'me', coords, label: 'You are here', color: '#208AEF' });
  if (pin) markers.push({ id: 'pin', coords: pin, label: 'Selected spot', color: '#D9694B' });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Pick a spot
          </ThemedText>
          {coords && (
            <Pressable
              onPress={handleCenterOnMe}
              style={[styles.locateButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Ionicons name="locate" size={18} color={theme.accent} />
            </Pressable>
          )}
        </ThemedView>

        <ThemedView style={styles.mapWrapper}>
          <GoogleMapView
            ref={mapRef}
            initialCenter={coords ?? FALLBACK_CENTER}
            initialZoom={coords ? LOCATED_ZOOM : FALLBACK_ZOOM}
            markers={markers}
            onPress={handlePick}
          />
        </ThemedView>

        <ScrollView contentContainerStyle={styles.content}>
          {!pin && (
            <ThemedText themeColor="textSecondary">
              Tap anywhere on the map to pick a location, then ask about it below.
            </ThemedText>
          )}

          {pin && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Selected location
              </ThemedText>
              <ThemedText type="subtitle" style={styles.pinLabel}>
                {geocoding ? 'Locating…' : pinLabel ?? 'Unknown area'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.pinCoords}>
                {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
              </ThemedText>

              {geocoding && <ActivityIndicator style={styles.geocodingSpinner} />}

              <ThemedView style={styles.explorerSpacing}>
                <LocationExplorer
                  coords={pin}
                  placeLabel={pinLabel}
                  category={category}
                  factsResult={result}
                  factsStatus={status}
                  factsError={factsError}
                  onSelectCategory={handleSelectCategory}
                />
              </ThemedView>
            </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  locateButton: {
    width: 40,
    height: 40,
    borderRadius: Spacing.five,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrapper: {
    width: '100%',
    height: 320,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  pinLabel: {
    fontSize: 22,
    lineHeight: 28,
  },
  pinCoords: {
    fontFamily: 'monospace',
  },
  geocodingSpinner: {
    alignSelf: 'flex-start',
  },
  explorerSpacing: {
    marginTop: Spacing.two,
  },
});
