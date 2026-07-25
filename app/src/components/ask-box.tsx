import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVoiceInput } from '@/hooks/use-voice-input';

interface SubmitOptions {
  viaVoice?: boolean;
}

interface Props {
  disabled?: boolean;
  placeholder?: string;
  onSubmit: (question: string, options?: SubmitOptions) => void;
}

export function AskBox({ disabled, placeholder, onSubmit }: Props) {
  const [question, setQuestion] = useState('');
  const theme = useTheme();
  const latestTranscript = useRef('');

  const submit = (text: string, options?: SubmitOptions) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed, options);
  };

  // Voice mode: once speech recognition ends, submit automatically and let the
  // answer come back spoken — a talk-and-listen loop instead of transcribe-then-tap.
  const { listening, error, start, stop } = useVoiceInput(
    (transcript) => {
      latestTranscript.current = transcript;
      setQuestion(transcript);
    },
    () => {
      if (latestTranscript.current.trim()) {
        submit(latestTranscript.current, { viaVoice: true });
        setQuestion('');
        latestTranscript.current = '';
      }
    }
  );

  const handleSubmit = () => submit(question);

  const canSend = !disabled && question.trim().length > 0;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold">{placeholder ?? 'Ask about this spot'}</ThemedText>
      <ThemedView
        style={[styles.pill, { backgroundColor: theme.backgroundElement, borderColor: theme.border, shadowColor: theme.text }]}>
        <Ionicons name="sparkles-outline" size={18} color={theme.textSecondary} style={styles.leadingIcon} />
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask anything — search, don't just look up wiki articles"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          editable={!disabled}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
        />
        <Pressable
          onPress={listening ? stop : start}
          disabled={disabled}
          style={[styles.iconButton, { backgroundColor: listening ? theme.accent : 'transparent' }]}>
          <Ionicons
            name={listening ? 'stop-circle' : 'mic-outline'}
            size={20}
            color={listening ? theme.accentContrast : theme.textSecondary}
          />
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSend}
          style={[styles.sendButton, { backgroundColor: theme.accent, opacity: canSend ? 1 : 0.4 }]}>
          <Ionicons name="arrow-up" size={18} color={theme.accentContrast} />
        </Pressable>
      </ThemedView>
      {listening && (
        <ThemedText type="small" themeColor="textSecondary">
          Listening… I'll ask and read the answer back when you stop.
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
    gap: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    gap: Spacing.one,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  leadingIcon: {
    marginRight: Spacing.half,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
