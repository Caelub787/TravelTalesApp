import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The interactive map is web-only (see map.web.tsx) — it's built with Leaflet, which
// needs a browser DOM and has no React Native equivalent.
export default function MapScreenNative() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <Ionicons name="map-outline" size={32} color={theme.textSecondary} />
          <ThemedText type="title" style={styles.title}>
            Map not available here
          </ThemedText>
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
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
});
