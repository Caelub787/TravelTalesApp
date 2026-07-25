import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useSavedItems, type SavedItem } from '@/hooks/use-saved-items';

interface Props {
  id: string;
  item: Omit<SavedItem, 'savedAt'>;
}

export function SaveButton({ id, item }: Props) {
  const { isSaved, toggleSave } = useSavedItems();
  const saved = isSaved(id);

  return (
    <Pressable onPress={() => toggleSave(item)} style={styles.button}>
      <ThemedText type="linkPrimary">{saved ? '🔖 Saved' : '🔖 Save'}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
  },
});
