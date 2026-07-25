import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';

import { router } from 'expo-router';

import { LocationExplorer } from '@/components/location-explorer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLiveLocation, type Coords } from '@/hooks/use-live-location';
import { useLocationFacts } from '@/hooks/use-location-facts';
import { reverseGeocode } from '@/utils/geocode';

const FALLBACK_REGION = {
  latitude: 40.0,
  longitude: -100.0,
  latitudeDelta: 40,
  longitudeDelta: 40,
};

export default function MapScreen() {
  const { permission, coords } = useLiveLocation();
  const [pin, setPin] = useState<Coords | null>(null);
  const [pinLabel, setPinLabel] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const { category, result, status, error: factsError, load } = useLocationFacts();

  const handleMapPress = useCallback((event: MapPressEvent) => {
    const nextPin = event.nativeEvent.coordinate;
    setPin(nextPin);
    setPinLabel(null);
    setGeocoding(true);
    reverseGeocode(nextPin)
      .then(setPinLabel)
      .catch(() => setPinLabel(null))
      .finally(() => setGeocoding(false));
  }, []);

  const handleSelectCategory = useCallback(
    (nextCategory: Parameters<typeof load>[0]) => {
      if (!pin) return;
      load(nextCategory, pin, pinLabel);
    },
    [pin, pinLabel, load]
  );

  const initialRegion = coords
    ? { ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : FALLBACK_REGION;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ThemedText type="linkPrimary">‹ Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Pick a spot</ThemedText>
          <ThemedView style={styles.headerSpacer} />
        </ThemedView>

        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={permission === 'granted'}
          onPress={handleMapPress}>
          {pin && <Marker coordinate={pin} pinColor="orange" />}
        </MapView>

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
              <ThemedText type="subtitle">
                {geocoding ? 'Locating…' : pinLabel ?? `${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}`}
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
  headerSpacer: {
    width: 48,
  },
  map: {
    width: '100%',
    height: 280,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  geocodingSpinner: {
    alignSelf: 'flex-start',
  },
  explorerSpacing: {
    marginTop: Spacing.two,
  },
});
