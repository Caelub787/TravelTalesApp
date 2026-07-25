import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnswerCard } from '@/components/answer-card';
import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSavedItems } from '@/hooks/use-saved-items';
import { useTheme } from '@/hooks/use-theme';

export default function SavedScreen() {
  const { items } = useSavedItems();
  const theme = useTheme();
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Saved
          </ThemedText>

          {sorted.length === 0 && (
            <ThemedView style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={32} color={theme.textSecondary} />
              <ThemedText themeColor="textSecondary">
                Nothing saved yet — tap Save on any story or answer to keep it here.
              </ThemedText>
            </ThemedView>
          )}

          {sorted.map((item) =>
            item.kind === 'facts' ? (
              <StoryCard key={item.id} result={item.data} />
            ) : (
              <AnswerCard key={item.id} result={item.data} />
            )
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
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
});
