import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Category, CategorySelection } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  categories: Category[];
  selected: CategorySelection | null;
  disabled?: boolean;
  onSelect: (id: CategorySelection) => void;
}

export function CategoryChips({ categories, selected, disabled, onSelect }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {categories.map((category) => {
        const isSelected = category.id === selected;
        return (
          <Pressable
            key={category.id}
            disabled={disabled}
            onPress={() => onSelect(category.id)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? theme.accent : theme.backgroundElement,
                borderColor: isSelected ? theme.accent : theme.border,
                opacity: disabled ? 0.5 : 1,
              },
            ]}>
            <Ionicons
              name={category.icon}
              size={16}
              color={isSelected ? theme.accentContrast : theme.textSecondary}
            />
            <ThemedText type="smallBold" themeColor={isSelected ? 'accentContrast' : 'text'}>
              {category.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1.5,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
