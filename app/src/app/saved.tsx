import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { AnswerCard } from '@/components/answer-card';
import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSavedItems } from '@/hooks/use-saved-items';

export default function SavedScreen() {
  const { items } = useSavedItems();
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <ThemedText type="linkPrimary">‹ Back</ThemedText>
            </Pressable>
            <ThemedText type="subtitle">Saved</ThemedText>
          </ThemedView>

          {sorted.length === 0 && (
            <ThemedText themeColor="textSecondary">
              Nothing saved yet — tap 🔖 Save on any story or answer to keep it here.
            </ThemedText>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
