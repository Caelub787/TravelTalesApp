import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface Props {
  placeLabel: string | null;
  hasMoved: boolean;
  onRefresh: () => void;
}

export function LocationHeader({ placeLabel, hasMoved, onRefresh }: Props) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        You are near
      </ThemedText>
      <ThemedText type="subtitle">{placeLabel ?? 'Locating…'}</ThemedText>

      {hasMoved && (
        <Pressable onPress={onRefresh} style={styles.banner}>
          <ThemedText type="linkPrimary">You've moved — tap to refresh stories</ThemedText>
        </Pressable>
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
