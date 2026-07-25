import { ChipButton } from '@/components/chip-button';
import { useSpeakable } from '@/hooks/use-speakable';

interface Props {
  text: string;
}

export function SpeakButton({ text }: Props) {
  const { speaking, toggle } = useSpeakable();

  return (
    <ChipButton
      label={speaking ? 'Stop' : 'Read aloud'}
      icon={speaking ? 'stop-circle' : 'volume-high-outline'}
      active={speaking}
      onPress={() => toggle(text)}
    />
  );
}
