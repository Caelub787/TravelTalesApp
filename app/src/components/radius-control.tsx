import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { RADIUS_OPTIONS_MILES, useSearchRadius } from '@/hooks/use-search-radius';
import { useTheme } from '@/hooks/use-theme';

export function RadiusControl() {
  const theme = useTheme();
  const { radiusMiles, setRadiusMiles } = useSearchRadius();
  const index = RADIUS_OPTIONS_MILES.indexOf(radiusMiles);

  const step = (delta: number) => {
    const nextIndex = Math.min(Math.max(index + delta, 0), RADIUS_OPTIONS_MILES.length - 1);
    setRadiusMiles(RADIUS_OPTIONS_MILES[nextIndex]);
  };

  return (
    <ThemedView style={styles.row}>
      <ThemedView style={styles.label}>
        <Ionicons name="radio-outline" size={14} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary">
          Search radius
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepper}>
        <Pressable onPress={() => step(-1)} disabled={index <= 0} style={{ opacity: index <= 0 ? 0.4 : 1 }}>
          <Ionicons name="remove-circle-outline" size={22} color={theme.accent} />
        </Pressable>
        <ThemedText type="smallBold" style={styles.value} themeColor="accent">
          {radiusMiles} mi
        </ThemedText>
        <Pressable
          onPress={() => step(1)}
          disabled={index >= RADIUS_OPTIONS_MILES.length - 1}
          style={{ opacity: index >= RADIUS_OPTIONS_MILES.length - 1 ? 0.4 : 1 }}>
          <Ionicons name="add-circle-outline" size={22} color={theme.accent} />
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  value: {
    minWidth: 44,
    textAlign: 'center',
  },
});
