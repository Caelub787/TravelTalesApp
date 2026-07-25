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
import { useSavedItems } from '@/hooks/use-saved-items';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/format-time';

type Tab = 'saved' | 'history';

export default function SavedScreen() {
  const { items } = useSavedItems();
  const { items: history, clear: clearHistory } = useArticleHistory();
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
  historyRow: {
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
