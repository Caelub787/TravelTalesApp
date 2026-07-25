import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useSpeakable } from '@/hooks/use-speakable';

interface Props {
  text: string;
}

export function SpeakButton({ text }: Props) {
  const { speaking, toggle } = useSpeakable();

  return (
    <Pressable onPress={() => toggle(text)} style={styles.button}>
      <ThemedText type="linkPrimary">{speaking ? '⏹ Stop' : '🔊 Read aloud'}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
  },
});
