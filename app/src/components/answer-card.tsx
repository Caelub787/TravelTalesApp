import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { SaveButton } from '@/components/save-button';
import { SpeakButton } from '@/components/speak-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Spacing } from '@/constants/theme';
import { answerSaveId } from '@/hooks/use-saved-items';
import { useTheme } from '@/hooks/use-theme';
import type { AskResponse } from '@/services/api';

interface Props {
  result: AskResponse;
}

export function AnswerCard({ result }: Props) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border, shadowColor: theme.text }]}>
      <ThemedView style={styles.questionRow}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.accent} />
        <ThemedText type="smallBold" style={styles.question}>
          {result.question}
        </ThemedText>
      </ThemedView>

      <ThemedText style={styles.answer}>{result.answer}</ThemedText>

      {!result.noVerifiedAnswerFound && (
        <ThemedView style={styles.actionRow}>
          <SpeakButton text={result.answer} />
          <SaveButton id={answerSaveId(result)} item={{ id: answerSaveId(result), kind: 'answer', data: result }} />
        </ThemedView>
      )}

      {result.sources.length > 0 && (
        <ThemedView style={[styles.sourceList, { borderTopColor: theme.border }]}>
          {result.sources.map((source, index) => (
            <ExternalLink key={index} href={source.url as `${string}:${string}`}>
              <ThemedView style={styles.sourceRow}>
                <Ionicons name="link-outline" size={12} color={theme.textSecondary} />
                <ThemedText type="link" themeColor="textSecondary">
                  {source.title}
                </ThemedText>
              </ThemedView>
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
    ...CardShadow,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  question: {
    flex: 1,
  },
  answer: {
    marginTop: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sourceList: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.one,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
});
