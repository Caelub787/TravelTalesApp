import { StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { SaveButton } from '@/components/save-button';
import { SpeakButton } from '@/components/speak-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { factsSaveId } from '@/hooks/use-saved-items';
import { useTheme } from '@/hooks/use-theme';
import type { LocationFactsResponse } from '@/services/api';

interface Props {
  result: LocationFactsResponse;
}

export function StoryCard({ result }: Props) {
  const theme = useTheme();

  if (result.noVerifiedFactsFound) {
    return (
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="subtitle">Nothing verified nearby yet</ThemedText>
        <ThemedText themeColor="textSecondary">
          A search around {result.locationLabel} didn't turn up any facts we could confirm from a real
          source. Try a different category, or check back once you've moved.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="subtitle">{result.title}</ThemedText>
      {result.locationLabel !== result.title && (
        <ThemedText type="small" themeColor="textSecondary">
          {result.locationLabel}
        </ThemedText>
      )}
      <ThemedText style={styles.summary}>{result.summary}</ThemedText>

      <ThemedView style={styles.actionRow}>
        <SpeakButton text={`${result.title}. ${result.summary}`} />
        <SaveButton id={factsSaveId(result)} item={{ id: factsSaveId(result), kind: 'facts', data: result }} />
      </ThemedView>

      <ThemedView style={styles.factList}>
        {result.facts.map((fact, index) => (
          <ThemedView key={index} style={styles.factRow}>
            <ThemedText>{'• '}{fact.text}</ThemedText>
            <ExternalLink href={fact.source.url as `${string}:${string}`}>
              <ThemedText type="link" themeColor="textSecondary">
                Source: {fact.source.title}
              </ThemedText>
            </ExternalLink>
          </ThemedView>
        ))}
      </ThemedView>
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
  summary: {
    marginTop: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  factList: {
    marginTop: Spacing.two,
    gap: Spacing.three,
  },
  factRow: {
    gap: Spacing.half,
  },
});
