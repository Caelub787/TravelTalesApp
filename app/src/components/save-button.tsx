import { ChipButton } from '@/components/chip-button';
import { useSavedItems, type SavedItem } from '@/hooks/use-saved-items';

interface Props {
  id: string;
  item: Omit<SavedItem, 'savedAt'>;
}

export function SaveButton({ id, item }: Props) {
  const { isSaved, toggleSave } = useSavedItems();
  const saved = isSaved(id);

  return (
    <ChipButton
      label={saved ? 'Saved' : 'Save'}
      icon={saved ? 'bookmark' : 'bookmark-outline'}
      active={saved}
      onPress={() => toggleSave(item)}
    />
  );
}
