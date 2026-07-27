import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Spacing } from '@/constants/theme';
import { useArticleViewer } from '@/hooks/use-article-viewer';
import { useTheme } from '@/hooks/use-theme';
import type { NearbyArticlesResponse } from '@/services/api';
import { openDirections } from '@/utils/open-directions';

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
  const { open } = useArticleViewer();

  if (result.articles.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border, shadowColor: theme.text }]}>
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          Nothing found nearby
        </ThemedText>
        <ThemedText themeColor="textSecondary">Try widening the search radius, or clearing the filter above.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.list}>
      <ThemedText type="small" themeColor="textSecondary">
        {result.articles.length} nearby article{result.articles.length === 1 ? '' : 's'}
      </ThemedText>
      {result.articles.map((article, index) => (
        <ThemedView
          key={index}
          type="backgroundElement"
          style={[styles.row, { borderColor: theme.border, shadowColor: theme.text }]}>
          <Pressable style={styles.rowMain} onPress={() => open(article.url, article.title)}>
            <ThemedView style={[styles.icon, { backgroundColor: theme.backgroundSelected }]}>
              <Ionicons name="document-text-outline" size={16} color={theme.accent} />
            </ThemedView>
            <ThemedView style={styles.rowBody}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {article.title}
              </ThemedText>
              {article.snippet.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {article.snippet}
                </ThemedText>
              )}
              <ThemedView style={styles.distanceRow}>
                <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDistance(article.distanceMeters)} away
                </ThemedText>
              </ThemedView>
            </ThemedView>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => openDirections({ latitude: article.latitude, longitude: article.longitude })}
            style={[styles.directionsButton, { borderColor: theme.border }]}
            accessibilityLabel={`Get directions to ${article.title}`}>
            <Ionicons name="navigate-outline" size={14} color={theme.accent} />
            <ThemedText type="small" themeColor="accent">
              Directions
            </ThemedText>
          </Pressable>
        </ThemedView>
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
    ...CardShadow,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    ...CardShadow,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: Spacing.half,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    marginTop: Spacing.half,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.half,
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
});
