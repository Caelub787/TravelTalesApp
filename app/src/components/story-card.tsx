import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { SaveButton } from '@/components/save-button';
import { SpeakButton } from '@/components/speak-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Spacing } from '@/constants/theme';
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
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border, shadowColor: theme.text }]}>
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          Nothing verified nearby yet
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          A search around {result.locationLabel} didn't turn up any facts we could confirm from a real
          source. Try a different category, or check back once you've moved.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border, shadowColor: theme.text }]}>
      <ThemedText type="subtitle" style={styles.title}>
        {result.title}
      </ThemedText>
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

      <ThemedView style={[styles.factList, { borderTopColor: theme.border }]}>
        {result.facts.map((fact, index) => (
          <ThemedView key={index} style={styles.factRow}>
            <ThemedView style={styles.factBullet}>
              <ThemedView style={[styles.dot, { backgroundColor: theme.accent }]} />
            </ThemedView>
            <ThemedView style={styles.factTextColumn}>
              <ThemedText>{fact.text}</ThemedText>
              <ExternalLink href={fact.source.url as `${string}:${string}`}>
                <ThemedView style={styles.sourceRow}>
                  <Ionicons name="link-outline" size={12} color={theme.textSecondary} />
                  <ThemedText type="link" themeColor="textSecondary">
                    {fact.source.title}
                  </ThemedText>
                </ThemedView>
              </ExternalLink>
            </ThemedView>
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
    ...CardShadow,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  summary: {
    marginTop: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  factList: {
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.three,
  },
  factRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  factBullet: {
    paddingTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  factTextColumn: {
    flex: 1,
    gap: Spacing.half,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
});
