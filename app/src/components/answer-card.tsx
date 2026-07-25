import { StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { SaveButton } from '@/components/save-button';
import { SpeakButton } from '@/components/speak-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { answerSaveId } from '@/hooks/use-saved-items';
import { useTheme } from '@/hooks/use-theme';
import type { AskResponse } from '@/services/api';

interface Props {
  result: AskResponse;
}

export function AnswerCard({ result }: Props) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        You asked
      </ThemedText>
      <ThemedText type="smallBold">{result.question}</ThemedText>

      <ThemedText style={styles.answer}>{result.answer}</ThemedText>

      {!result.noVerifiedAnswerFound && (
        <ThemedView style={styles.actionRow}>
          <SpeakButton text={result.answer} />
          <SaveButton id={answerSaveId(result)} item={{ id: answerSaveId(result), kind: 'answer', data: result }} />
        </ThemedView>
      )}

      {result.sources.length > 0 && (
        <ThemedView style={styles.sourceList}>
          {result.sources.map((source, index) => (
            <ExternalLink key={index} href={source.url as `${string}:${string}`}>
              <ThemedText type="link" themeColor="textSecondary">
                Source: {source.title}
              </ThemedText>
            </ExternalLink>
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  answer: {
    marginTop: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  sourceList: {
    marginTop: Spacing.two,
    gap: Spacing.one,
  },
});
