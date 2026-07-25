import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Spacing } from '@/constants/theme';
import type { Coords } from '@/hooks/use-live-location';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  placeLabel: string | null;
  coords: Coords | null;
  hasMoved: boolean;
  onRefresh: () => void;
}

export function LocationHeader({ placeLabel, coords, hasMoved, onRefresh }: Props) {
  const theme = useTheme();
  const coordsLabel = coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : null;

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border, shadowColor: theme.text }]}>
      <ThemedView style={styles.row}>
        <ThemedView style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name="location" size={20} color={theme.accent} />
        </ThemedView>
        <ThemedView style={styles.textColumn}>
          <ThemedText type="small" themeColor="textSecondary">
            You are near
          </ThemedText>
          <ThemedText type="subtitle" style={styles.placeName} numberOfLines={2}>
            {placeLabel ?? 'Locating…'}
          </ThemedText>
          {coordsLabel && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.coords}>
              {coordsLabel}
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>

      {hasMoved && (
        <Pressable onPress={onRefresh} style={[styles.refreshPill, { backgroundColor: theme.accent }]}>
          <Ionicons name="refresh" size={14} color={theme.accentContrast} />
          <ThemedText type="smallBold" themeColor="accentContrast">
            You've moved — tap to refresh
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
    ...CardShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: Spacing.half,
  },
  placeName: {
    fontSize: 22,
    lineHeight: 28,
  },
  coords: {
    fontFamily: 'monospace',
  },
  refreshPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
});
