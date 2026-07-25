import L, { type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';

import { router } from 'expo-router';

import { LocationExplorer } from '@/components/location-explorer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLiveLocation, type Coords } from '@/hooks/use-live-location';
import { useLocationFacts } from '@/hooks/use-location-facts';
import { reverseGeocode } from '@/utils/geocode';

// Leaflet's default marker icons resolve to broken paths under most bundlers (Metro
// included) — point them at Leaflet's own CDN-hosted images instead.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const FALLBACK_CENTER: [number, number] = [40, -100];
const FALLBACK_ZOOM = 4;
const LOCATED_ZOOM = 14;

function ClickHandler({ onPick }: { onPick: (coords: Coords) => void }) {
  useMapEvents({
    click(event) {
      onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export default function MapScreenWeb() {
  const { coords } = useLiveLocation();
  const [pin, setPin] = useState<Coords | null>(null);
  const [pinLabel, setPinLabel] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const { category, result, status, error: factsError, load } = useLocationFacts();
  const mapRef = useRef<LeafletMap | null>(null);
  const hasCenteredOnLocation = useRef(false);

  useEffect(() => {
    if (coords && mapRef.current && !hasCenteredOnLocation.current) {
      hasCenteredOnLocation.current = true;
      mapRef.current.setView([coords.latitude, coords.longitude], LOCATED_ZOOM);
    }
  }, [coords]);

  const handlePick = useCallback((nextPin: Coords) => {
    setPin(nextPin);
    setPinLabel(null);
    setGeocoding(true);
    reverseGeocode(nextPin)
      .then(setPinLabel)
      .catch(() => setPinLabel(null))
      .finally(() => setGeocoding(false));
  }, []);

  const handleCenterOnMe = useCallback(() => {
    if (coords && mapRef.current) {
      mapRef.current.setView([coords.latitude, coords.longitude], LOCATED_ZOOM);
    }
  }, [coords]);

  const handleSelectCategory = useCallback(
    (nextCategory: Parameters<typeof load>[0]) => {
      if (!pin) return;
      load(nextCategory, pin, pinLabel);
    },
    [pin, pinLabel, load]
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ThemedText type="linkPrimary">‹ Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Pick a spot</ThemedText>
          {coords ? (
            <Pressable onPress={handleCenterOnMe}>
              <ThemedText type="linkPrimary">📍 Me</ThemedText>
            </Pressable>
          ) : (
            <ThemedView style={styles.headerSpacer} />
          )}
        </ThemedView>

        <ThemedView style={styles.mapWrapper}>
          <MapContainer
            ref={mapRef}
            center={coords ? [coords.latitude, coords.longitude] : FALLBACK_CENTER}
            zoom={coords ? LOCATED_ZOOM : FALLBACK_ZOOM}
            style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={handlePick} />
            {coords && (
              <Marker position={[coords.latitude, coords.longitude]}>
                <Popup>You are here</Popup>
              </Marker>
            )}
            {pin && (
              <Marker position={[pin.latitude, pin.longitude]}>
                <Popup>Selected spot</Popup>
              </Marker>
            )}
          </MapContainer>
        </ThemedView>

        <ScrollView contentContainerStyle={styles.content}>
          {!pin && (
            <ThemedText themeColor="textSecondary">
              Click anywhere on the map to pick a location, then ask about it below.
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
  mapWrapper: {
    width: '100%',
    height: 320,
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
