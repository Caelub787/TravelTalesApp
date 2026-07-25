import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props extends Omit<PressableProps, 'style'> {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  active?: boolean;
}

export function ChipButton({ label, icon, active, ...pressableProps }: Props) {
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
      <Ionicons name={icon} size={14} color={active ? theme.accentContrast : theme.text} />
      <ThemedText type="smallBold" themeColor={active ? 'accentContrast' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    alignSelf: 'flex-start',
  },
});
