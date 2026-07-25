import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationExplorer } from '@/components/location-explorer';
import { LocationHeader } from '@/components/location-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLiveLocation } from '@/hooks/use-live-location';
import { useLocationFacts } from '@/hooks/use-location-facts';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const { permission, coords, placeLabel, error: locationError } = useLiveLocation();
  const { category, result, status, error: factsError, load, hasMovedSinceLastFetch } = useLocationFacts();

  const handleSelectCategory = useCallback(
    (nextCategory: Parameters<typeof load>[0]) => {
      if (!coords) return;
      load(nextCategory, coords, placeLabel);
    },
    [coords, placeLabel, load]
  );

  const handleRefresh = useCallback(() => {
    if (!coords || !category) return;
    load(category, coords, placeLabel);
  }, [coords, category, placeLabel, load]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.header}>
            <Ionicons name="compass" size={26} color={theme.accent} />
            <ThemedText type="title" style={styles.appTitle}>
              TravelTales
            </ThemedText>
          </ThemedView>

          {permission === 'denied' && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>
                TravelTales needs location access to tell you what's around you. Enable location
                permissions for this app in your device settings, then reopen it.
              </ThemedText>
            </ThemedView>
          )}

          {permission === 'checking' && (
            <ThemedView style={styles.notice}>
              <ActivityIndicator />
              <ThemedText themeColor="textSecondary">Requesting location access…</ThemedText>
            </ThemedView>
          )}

          {locationError && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>Location error: {locationError}</ThemedText>
            </ThemedView>
          )}

          {permission === 'granted' && (
            <>
              <LocationHeader
                placeLabel={placeLabel}
                coords={coords}
                hasMoved={hasMovedSinceLastFetch(coords)}
                onRefresh={handleRefresh}
              />
              <ThemedView style={styles.explorerSpacing}>
                <LocationExplorer
                  coords={coords}
                  placeLabel={placeLabel}
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
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  appTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  explorerSpacing: {
    marginTop: Spacing.two,
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
});
