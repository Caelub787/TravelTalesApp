import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// The interactive map is web-only (see map.web.tsx) — it's built with Leaflet, which
// needs a browser DOM and has no React Native equivalent.
export default function MapScreenNative() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <Pressable onPress={() => router.back()}>
            <ThemedText type="linkPrimary">‹ Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Map not available here</ThemedText>
          <ThemedText themeColor="textSecondary">
            The interactive map is only available in the TravelTales website — open it in a
            browser to pick a location on the map. Everything else (categories, questions,
            voice, read aloud) works right here.
          </ThemedText>
        </ThemedView>
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
});
