import { StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NearbyArticlesResponse } from '@/services/api';

interface Props {
  result: NearbyArticlesResponse;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters)} m`;
  return `${miles.toFixed(1)} mi`;
}

export function NearbyArticlesList({ result }: Props) {
  const theme = useTheme();

  if (result.articles.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="subtitle">Nothing found nearby</ThemedText>
        <ThemedText themeColor="textSecondary">
          Try widening the search radius above.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.list}>
      <ThemedText type="small" themeColor="textSecondary">
        {result.articles.length} nearby article{result.articles.length === 1 ? '' : 's'} — tap one to read it
      </ThemedText>
      {result.articles.map((article, index) => (
        <ExternalLink key={index} href={article.url as `${string}:${string}`}>
          <ThemedView type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
            <ThemedView style={styles.rowHeader}>
              <ThemedText type="smallBold" style={styles.title}>
                {article.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDistance(article.distanceMeters)}
              </ThemedText>
            </ThemedView>
            {article.snippet.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {article.snippet}
              </ThemedText>
            )}
          </ThemedView>
        </ExternalLink>
      ))}
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
  list: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
});
