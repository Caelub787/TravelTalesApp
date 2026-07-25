import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { AnswerCard } from '@/components/answer-card';
import { AskBox } from '@/components/ask-box';
import { CategoryGrid } from '@/components/category-grid';
import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { CategoryId } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useAskQuestion } from '@/hooks/use-ask-question';
import type { Coords } from '@/hooks/use-live-location';
import type { LocationFactsStatus } from '@/hooks/use-location-facts';
import type { LocationFactsResponse } from '@/services/api';

interface Props {
  coords: Coords | null;
  placeLabel: string | null;
  category: CategoryId | null;
  factsResult: LocationFactsResponse | null;
  factsStatus: LocationFactsStatus;
  factsError: string | null;
  onSelectCategory: (category: CategoryId) => void;
}

export function LocationExplorer({
  coords,
  placeLabel,
  category,
  factsResult,
  factsStatus,
  factsError,
  onSelectCategory,
}: Props) {
  const { result: askResult, status: askStatus, error: askError, ask } = useAskQuestion();

  const handleAsk = useCallback(
    (question: string) => {
      if (!coords) return;
      ask(question, coords, placeLabel);
    },
    [coords, placeLabel, ask]
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold">What do you want to know about here?</ThemedText>
      <CategoryGrid selected={category} disabled={!coords} onSelect={onSelectCategory} />

      {factsStatus === 'loading' && (
        <ThemedView style={styles.notice}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">Searching for verified stories…</ThemedText>
        </ThemedView>
      )}
      {factsStatus === 'error' && (
        <ThemedView type="backgroundElement" style={styles.notice}>
          <ThemedText>Couldn't load stories: {factsError}</ThemedText>
        </ThemedView>
      )}
      {factsStatus === 'success' && factsResult && <StoryCard result={factsResult} />}

      <AskBox disabled={!coords} onSubmit={handleAsk} />

      {askStatus === 'loading' && (
        <ThemedView style={styles.notice}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">Looking that up…</ThemedText>
        </ThemedView>
      )}
      {askStatus === 'error' && (
        <ThemedView type="backgroundElement" style={styles.notice}>
          <ThemedText>Couldn't get an answer: {askError}</ThemedText>
        </ThemedView>
      )}
      {askStatus === 'success' && askResult && <AnswerCard result={askResult} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
});
