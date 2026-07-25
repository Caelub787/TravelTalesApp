import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  disabled?: boolean;
  onPress: () => void;
}

export function SurpriseButton({ disabled, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.accent, opacity: disabled ? 0.5 : 1 }]}>
      <Ionicons name="sparkles" size={16} color={theme.accentContrast} />
      <ThemedText type="smallBold" themeColor="accentContrast">
        Surprise me
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
