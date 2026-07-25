import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVoiceInput } from '@/hooks/use-voice-input';

interface Props {
  disabled?: boolean;
  onSubmit: (question: string) => void;
}

export function AskBox({ disabled, onSubmit }: Props) {
  const [question, setQuestion] = useState('');
  const theme = useTheme();
  const { listening, error, start, stop } = useVoiceInput((transcript) => setQuestion(transcript));

  const handleSubmit = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold">Ask about this spot</ThemedText>
      <ThemedView style={styles.row}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="e.g. Why is this street named that?"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          editable={!disabled}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
        />
        <Pressable
          onPress={listening ? stop : start}
          disabled={disabled}
          style={[
            styles.iconButton,
            { backgroundColor: listening ? theme.accent : theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText>{listening ? '⏺' : '🎤'}</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={disabled || question.trim().length === 0}
          style={[
            styles.iconButton,
            {
              backgroundColor: theme.accent,
              borderColor: theme.border,
              opacity: disabled || question.trim().length === 0 ? 0.4 : 1,
            },
          ]}>
          <ThemedText themeColor="accentContrast">➤</ThemedText>
        </Pressable>
      </ThemedView>
      {listening && (
        <ThemedText type="small" themeColor="textSecondary">
          Listening…
        </ThemedText>
      )}
      {error && (
        <ThemedText type="small" themeColor="textSecondary">
          {error}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  iconButton: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
