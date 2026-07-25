import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props extends Omit<PressableProps, 'style'> {
  label: string;
  active?: boolean;
}

export function ChipButton({ label, active, ...pressableProps }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      {...pressableProps}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accent : theme.backgroundSelected,
          borderColor: active ? theme.accent : theme.border,
        },
      ]}>
      <ThemedText type="smallBold" themeColor={active ? 'accentContrast' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    alignSelf: 'flex-start',
  },
});
