import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AnswerCard } from '@/components/answer-card';
import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Spacing } from '@/constants/theme';
import type { AttachmentType } from '@/hooks/use-conversation';
import { useOfflineArticles, type OfflineArticle } from '@/hooks/use-offline-articles';
import { useOfflineTrips, type Trip } from '@/hooks/use-offline-trips';
import { useTheme } from '@/hooks/use-theme';
import type { AskResponse, LocationFactsResponse } from '@/services/api';

interface Props {
  messageId: string;
  attachmentType: AttachmentType;
  attachment: unknown;
}

function formatMiles(meters: number): string {
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

function TripAttachment({ messageId, trip }: { messageId: string; trip: Trip }) {
  const theme = useTheme();
  const { trips, saveTrip } = useOfflineTrips();
  const localId = `shared-${messageId}`;
  const saved = trips.some((existing) => existing.id === localId);

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border, shadowColor: theme.text }]}>
      <ThemedView style={styles.cardHeader}>
        <Ionicons name="trail-sign-outline" size={16} color={theme.accent} />
        <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
          {trip.name}
        </ThemedText>
      </ThemedView>
      <ThemedText type="small" themeColor="textSecondary">
        {formatMiles(trip.totalDistanceMeters)} · {trip.stops.length} stop{trip.stops.length === 1 ? '' : 's'}
      </ThemedText>
      <Pressable
        onPress={() => saveTrip({ ...trip, id: localId, createdAt: Date.now() })}
        disabled={saved}
        style={[styles.saveButton, { backgroundColor: saved ? theme.backgroundSelected : theme.accent }]}>
        <Ionicons name={saved ? 'checkmark' : 'download-outline'} size={14} color={saved ? theme.accent : theme.accentContrast} />
        <ThemedText type="small" themeColor={saved ? 'accent' : 'accentContrast'}>
          {saved ? 'Added to your Trips' : 'Add to my Trips'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function ArticleAttachment({ article }: { article: OfflineArticle }) {
  const theme = useTheme();
  const { findByUrl, saveArticle } = useOfflineArticles();
  const [justSaved, setJustSaved] = useState(false);
  const saved = justSaved || findByUrl(article.url) !== null;

  return (
    <ThemedView style={[styles.card, { borderColor: theme.border, shadowColor: theme.text }]}>
      <ThemedView style={styles.cardHeader}>
        <Ionicons name="document-text-outline" size={16} color={theme.accent} />
        <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
          {article.title}
        </ThemedText>
      </ThemedView>
      {article.extract.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
          {article.extract}
        </ThemedText>
      )}
      <Pressable
        onPress={() => {
          saveArticle({ ...article, downloadedAt: Date.now() });
          setJustSaved(true);
        }}
        disabled={saved}
        style={[styles.saveButton, { backgroundColor: saved ? theme.backgroundSelected : theme.accent }]}>
        <Ionicons name={saved ? 'checkmark' : 'download-outline'} size={14} color={saved ? theme.accent : theme.accentContrast} />
        <ThemedText type="small" themeColor={saved ? 'accent' : 'accentContrast'}>
          {saved ? 'Saved for offline' : 'Save for offline'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

export function MessageAttachment({ messageId, attachmentType, attachment }: Props) {
  if (attachmentType === 'trip') return <TripAttachment messageId={messageId} trip={attachment as Trip} />;
  if (attachmentType === 'article') return <ArticleAttachment article={attachment as OfflineArticle} />;
  if (attachmentType === 'story') return <StoryCard result={attachment as LocationFactsResponse} />;
  return <AnswerCard result={attachment as AskResponse} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    ...CardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
});
