import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORIES, type CategoryId } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  selected: CategoryId | null;
  disabled?: boolean;
  onSelect: (category: CategoryId) => void;
}

export function CategoryGrid({ selected, disabled, onSelect }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {CATEGORIES.map((category) => {
        const isSelected = category.id === selected;
        return (
          <Pressable
            key={category.id}
            disabled={disabled}
            onPress={() => onSelect(category.id)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement,
                opacity: disabled ? 0.5 : 1,
              },
            ]}>
            <ThemedText style={styles.icon}>{category.icon}</ThemedText>
            <ThemedText type="smallBold" style={styles.label}>
              {category.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: Spacing.one,
  },
  icon: {
    fontSize: 28,
  },
  label: {
    textAlign: 'center',
  },
});
