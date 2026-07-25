import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { LocationExplorer } from '@/components/location-explorer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLiveLocation, type Coords } from '@/hooks/use-live-location';
import { useLocationFacts } from '@/hooks/use-location-facts';
import { reverseGeocode } from '@/utils/geocode';

// react-native-maps has no interactive web implementation, so the web build uses manual
// coordinate entry instead of a tap-to-pin map.
export default function MapScreenWeb() {
  const { coords } = useLiveLocation();
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [pin, setPin] = useState<Coords | null>(null);
  const [pinLabel, setPinLabel] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const theme = useTheme();
  const { category, result, status, error: factsError, load } = useLocationFacts();

  const handleUseCurrentLocation = useCallback(() => {
    if (!coords) return;
    setLatInput(String(coords.latitude));
    setLonInput(String(coords.longitude));
    setPin(coords);
    setPinLabel(null);
  }, [coords]);

  const handleSetPin = useCallback(() => {
    const latitude = Number(latInput);
    const longitude = Number(lonInput);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return;

    const nextPin = { latitude, longitude };
    setPin(nextPin);
    setPinLabel(null);
    setGeocoding(true);
    reverseGeocode(nextPin)
      .then(setPinLabel)
      .catch(() => setPinLabel(null))
      .finally(() => setGeocoding(false));
  }, [latInput, lonInput]);

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
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <ThemedText type="linkPrimary">‹ Back</ThemedText>
            </Pressable>
            <ThemedText type="subtitle">Pick a spot</ThemedText>
          </ThemedView>

          <ThemedText themeColor="textSecondary">
            The interactive map isn't available in the browser — enter coordinates directly, or
            use your current location.
          </ThemedText>

          {coords && (
            <Pressable onPress={handleUseCurrentLocation}>
              <ThemedText type="linkPrimary">📍 Use my current location</ThemedText>
            </Pressable>
          )}

          <ThemedView style={styles.row}>
            <TextInput
              value={latInput}
              onChangeText={setLatInput}
              placeholder="Latitude"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={lonInput}
              onChangeText={setLonInput}
              placeholder="Longitude"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Pressable onPress={handleSetPin} style={[styles.setButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Set</ThemedText>
            </Pressable>
          </ThemedView>

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
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  setButton: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  geocodingSpinner: {
    alignSelf: 'flex-start',
  },
  explorerSpacing: {
    marginTop: Spacing.two,
  },
});
