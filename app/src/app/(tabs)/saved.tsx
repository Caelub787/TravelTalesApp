import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnswerCard } from '@/components/answer-card';
import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, MaxContentWidth, Spacing } from '@/constants/theme';
import { useArticleHistory } from '@/hooks/use-article-history';
import { useArticleViewer } from '@/hooks/use-article-viewer';
import { useOfflineAreas } from '@/hooks/use-offline-areas';
import { useOfflineArticles } from '@/hooks/use-offline-articles';
import { useSavedItems } from '@/hooks/use-saved-items';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/format-time';

type Tab = 'saved' | 'history' | 'offline';

export default function SavedScreen() {
  const { items } = useSavedItems();
  const { items: history, clear: clearHistory } = useArticleHistory();
  const { areas, deleteArea } = useOfflineAreas();
  const { articles: offlineArticles, deleteArticle } = useOfflineArticles();
  const { open } = useArticleViewer();
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('saved');

  const sortedSaved = [...items].sort((a, b) => b.savedAt - a.savedAt);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Saved
          </ThemedText>

          <ThemedView style={styles.tabRow}>
            {(
              [
                { id: 'saved' as const, label: 'Saved', icon: 'bookmark-outline' as const },
                { id: 'history' as const, label: 'History', icon: 'time-outline' as const },
                { id: 'offline' as const, label: 'Offline content', icon: 'cloud-download-outline' as const },
              ]
            ).map((option) => {
              const selected = option.id === tab;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setTab(option.id)}
                  style={[
                    styles.tabChip,
                    {
                      backgroundColor: selected ? theme.accent : theme.backgroundElement,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}>
                  <Ionicons name={option.icon} size={16} color={selected ? theme.accentContrast : theme.textSecondary} />
                  <ThemedText type="smallBold" themeColor={selected ? 'accentContrast' : 'text'}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>

          {tab === 'saved' && (
            <>
              {sortedSaved.length === 0 && (
                <ThemedView style={styles.emptyState}>
                  <Ionicons name="bookmark-outline" size={32} color={theme.textSecondary} />
                  <ThemedText themeColor="textSecondary">
                    Nothing saved yet — tap Save on any story or answer to keep it here.
                  </ThemedText>
                </ThemedView>
              )}
              {sortedSaved.map((item) =>
                item.kind === 'facts' ? (
                  <StoryCard key={item.id} result={item.data} />
                ) : (
                  <AnswerCard key={item.id} result={item.data} />
                )
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {history.length === 0 && (
                <ThemedView style={styles.emptyState}>
                  <Ionicons name="time-outline" size={32} color={theme.textSecondary} />
                  <ThemedText themeColor="textSecondary">
                    Articles you open will show up here so you can find them again later.
                  </ThemedText>
                </ThemedView>
              )}
              {history.length > 0 && (
                <Pressable onPress={clearHistory} style={styles.clearButton}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Clear history
                  </ThemedText>
                </Pressable>
              )}
              {history.map((entry) => (
                <Pressable key={`${entry.url}:${entry.viewedAt}`} onPress={() => open(entry.url, entry.title)}>
                  <ThemedView
                    type="backgroundElement"
                    style={[styles.historyRow, { borderColor: theme.border, shadowColor: theme.text }]}>
                    <ThemedView style={[styles.historyIcon, { backgroundColor: theme.backgroundSelected }]}>
                      <Ionicons name="document-text-outline" size={16} color={theme.accent} />
                    </ThemedView>
                    <ThemedView style={styles.historyBody}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {entry.title}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatRelativeTime(entry.viewedAt)}
                      </ThemedText>
                    </ThemedView>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </ThemedView>
                </Pressable>
              ))}
            </>
          )}

          {tab === 'offline' && (
            <>
              <ThemedText type="smallBold">Downloaded areas</ThemedText>
              {areas.length === 0 && (
                <ThemedView style={styles.emptyState}>
                  <Ionicons name="cloud-download-outline" size={32} color={theme.textSecondary} />
                  <ThemedText themeColor="textSecondary">
                    No downloaded areas yet — on the Explore screen (Wiki Facts mode), tap
                    "Download this area for offline" to browse and search it with no
                    connection.
                  </ThemedText>
                </ThemedView>
              )}
              {areas.map((area) => (
                <ThemedView
                  key={area.id}
                  type="backgroundElement"
                  style={[styles.areaRow, { borderColor: theme.border, shadowColor: theme.text }]}>
                  <ThemedView style={[styles.historyIcon, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name="location" size={16} color={theme.accent} />
                  </ThemedView>
                  <ThemedView style={styles.historyBody}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {area.placeLabel ?? `${area.center.latitude.toFixed(3)}, ${area.center.longitude.toFixed(3)}`}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {area.radiusMiles} mi radius · {area.articles.length} articles · downloaded{' '}
                      {formatRelativeTime(area.downloadedAt)}
                    </ThemedText>
                  </ThemedView>
                  <Pressable onPress={() => deleteArea(area.id)}>
                    <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                  </Pressable>
                </ThemedView>
              ))}

              <ThemedText type="smallBold" style={styles.sectionSpacing}>
                Downloaded articles
              </ThemedText>
              {offlineArticles.length === 0 && (
                <ThemedView style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={32} color={theme.textSecondary} />
                  <ThemedText themeColor="textSecondary">
                    No individually downloaded articles yet — open any article and tap
                    "Download for offline" to keep just that one for later.
                  </ThemedText>
                </ThemedView>
              )}
              {offlineArticles.map((article) => (
                <Pressable key={article.url} onPress={() => open(article.url, article.title)}>
                  <ThemedView
                    type="backgroundElement"
                    style={[styles.areaRow, { borderColor: theme.border, shadowColor: theme.text }]}>
                    <ThemedView style={[styles.historyIcon, { backgroundColor: theme.backgroundSelected }]}>
                      <Ionicons name="document-text-outline" size={16} color={theme.accent} />
                    </ThemedView>
                    <ThemedView style={styles.historyBody}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {article.title}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        downloaded {formatRelativeTime(article.downloadedAt)}
                      </ThemedText>
                    </ThemedView>
                    <Pressable onPress={() => deleteArticle(article.url)}>
                      <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                    </Pressable>
                  </ThemedView>
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1.5,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  clearButton: {
    alignSelf: 'flex-end',
  },
  sectionSpacing: {
    marginTop: Spacing.two,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    ...CardShadow,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    ...CardShadow,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
    gap: Spacing.half,
  },
});
