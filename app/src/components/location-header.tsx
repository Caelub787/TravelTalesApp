import { StyleSheet } from 'react-native';

import { ChipButton } from '@/components/chip-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Coords } from '@/hooks/use-live-location';

interface Props {
  placeLabel: string | null;
  coords: Coords | null;
  hasMoved: boolean;
  onRefresh: () => void;
}

export function LocationHeader({ placeLabel, coords, hasMoved, onRefresh }: Props) {
  const fallback = coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : 'Locating…';

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        You are near
      </ThemedText>
      <ThemedText type="subtitle">{placeLabel ?? fallback}</ThemedText>

      {hasMoved && (
        <ThemedView style={styles.banner}>
          <ChipButton label="📍 You've moved — tap to refresh" active onPress={onRefresh} />
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.half,
  },
  banner: {
    marginTop: Spacing.two,
  },
});
