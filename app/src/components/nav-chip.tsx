import { Pressable, StyleSheet } from 'react-native';

import { Link, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  href: Href;
  label: string;
}

export function NavChip({ href, label }: Props) {
  const theme = useTheme();

  return (
    <Link href={href} asChild>
      <Pressable style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
});
