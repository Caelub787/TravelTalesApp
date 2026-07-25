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
      <ThemedText type="small" themeColor="textSecondary">
        Search radius
      </ThemedText>
      <ThemedView style={styles.stepper}>
        <Pressable
          onPress={() => step(-1)}
          disabled={index <= 0}
          style={[styles.stepButton, { backgroundColor: theme.backgroundElement, opacity: index <= 0 ? 0.4 : 1 }]}>
          <ThemedText type="smallBold">−</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.value} themeColor="accent">
          {radiusMiles} mi
        </ThemedText>
        <Pressable
          onPress={() => step(1)}
          disabled={index >= RADIUS_OPTIONS_MILES.length - 1}
          style={[
            styles.stepButton,
            { backgroundColor: theme.backgroundElement, opacity: index >= RADIUS_OPTIONS_MILES.length - 1 ? 0.4 : 1 },
          ]}>
          <ThemedText type="smallBold">+</ThemedText>
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
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 48,
    textAlign: 'center',
  },
});
