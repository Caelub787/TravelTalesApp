import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryGrid } from '@/components/category-grid';
import { LocationHeader } from '@/components/location-header';
import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { CategoryId } from '@/constants/categories';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLiveLocation } from '@/hooks/use-live-location';
import { useLocationFacts } from '@/hooks/use-location-facts';

export default function HomeScreen() {
  const { permission, coords, placeLabel, error: locationError } = useLiveLocation();
  const { category, result, status, error: factsError, load, hasMovedSinceLastFetch } = useLocationFacts();

  const handleSelectCategory = useCallback(
    (nextCategory: CategoryId) => {
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
          <ThemedText type="title" style={styles.appTitle}>
            TravelTales
          </ThemedText>

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
                hasMoved={hasMovedSinceLastFetch(coords)}
                onRefresh={handleRefresh}
              />

              <ThemedText type="smallBold" style={styles.sectionLabel}>
                What do you want to know about here?
              </ThemedText>
              <CategoryGrid selected={category} disabled={!coords} onSelect={handleSelectCategory} />

              {status === 'loading' && (
                <ThemedView style={styles.notice}>
                  <ActivityIndicator />
                  <ThemedText themeColor="textSecondary">Searching for verified stories…</ThemedText>
                </ThemedView>
              )}

              {status === 'error' && (
                <ThemedView type="backgroundElement" style={styles.notice}>
                  <ThemedText>Couldn't load stories: {factsError}</ThemedText>
                </ThemedView>
              )}

              {status === 'success' && result && <StoryCard result={result} />}
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
  appTitle: {
    fontSize: 32,
    lineHeight: 38,
  },
  sectionLabel: {
    marginTop: Spacing.two,
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
});
