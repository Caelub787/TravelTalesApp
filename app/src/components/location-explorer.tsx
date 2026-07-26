import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { AnswerCard } from '@/components/answer-card';
import { AskBox } from '@/components/ask-box';
import { CategoryChips } from '@/components/category-chips';
import { NearbyArticlesList } from '@/components/nearby-articles-list';
import { RadiusControl } from '@/components/radius-control';
import { StoryCard } from '@/components/story-card';
import { SurpriseButton } from '@/components/surprise-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ALL_CATEGORY, CATEGORIES, type CategoryId } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useArticleViewer } from '@/hooks/use-article-viewer';
import { useAskQuestion } from '@/hooks/use-ask-question';
import { useContentMode } from '@/hooks/use-content-mode';
import type { Coords } from '@/hooks/use-live-location';
import type { LocationFactsStatus } from '@/hooks/use-location-facts';
import { useNearbyArticles } from '@/hooks/use-nearby-articles';
import { useOfflineAreas } from '@/hooks/use-offline-areas';
import { useReadPreference } from '@/hooks/use-read-preference';
import { useSearchRadius } from '@/hooks/use-search-radius';
import { useSpeakable } from '@/hooks/use-speakable';
import { useTheme } from '@/hooks/use-theme';
import { fetchNearbyArticles, type LocationFactsResponse, type NearbyArticle } from '@/services/api';
import { matchesCategory } from '@/utils/category-match';
import { distanceMeters } from '@/utils/distance';
import { reverseGeocode } from '@/utils/geocode';

const MOVED_THRESHOLD_METERS = 400;

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
  const theme = useTheme();
  const { mode } = useContentMode();
  const { radiusMiles } = useSearchRadius();
  const { preference: readPreference } = useReadPreference();
  const { speak } = useSpeakable();
  const { open: openArticle } = useArticleViewer();
  const { saveArea } = useOfflineAreas();
  const { result: askResult, status: askStatus, error: askError, ask } = useAskQuestion();
  const { result: nearbyResult, status: nearbyStatus, error: nearbyError, isOffline, fetchNearby } = useNearbyArticles();
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const [areaDownloadStatus, setAreaDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const lastFetchedCoordsRef = useRef<Coords | null>(null);
  const lastRadiusRef = useRef<number | null>(null);
  const lastAskWasVoiceRef = useRef(false);

  useEffect(() => {
    if (mode !== 'wiki' || !coords) return;
    const prev = lastFetchedCoordsRef.current;
    const movedEnough = !prev || distanceMeters(prev, coords) >= MOVED_THRESHOLD_METERS;
    const radiusChanged = lastRadiusRef.current !== null && lastRadiusRef.current !== radiusMiles;
    if (movedEnough || radiusChanged) {
      lastFetchedCoordsRef.current = coords;
      lastRadiusRef.current = radiusMiles;
      fetchNearby(coords);
    } else {
      lastRadiusRef.current = radiusMiles;
    }
  }, [mode, coords, radiusMiles, fetchNearby]);

  const filteredArticles = useMemo(() => {
    const articles = nearbyResult?.articles ?? [];
    if (filter === 'all') return articles;
    return articles.filter((article) => matchesCategory(`${article.title} ${article.snippet}`, filter));
  }, [nearbyResult, filter]);

  const handleAsk = useCallback(
    (question: string, options?: { viaVoice?: boolean }) => {
      if (!coords) return;
      lastAskWasVoiceRef.current = Boolean(options?.viaVoice);
      ask(question, coords, placeLabel);
    },
    [coords, placeLabel, ask]
  );

  // A voice-initiated question always gets a spoken answer back (that's the talk-and-listen
  // loop); a typed one follows the user's general read-aloud preference from Settings.
  useEffect(() => {
    if (!askResult || askResult.noVerifiedAnswerFound) return;
    if (lastAskWasVoiceRef.current || readPreference === 'voice') {
      speak(askResult.answer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askResult]);

  useEffect(() => {
    if (!factsResult || factsResult.noVerifiedFactsFound || readPreference !== 'voice') return;
    speak(`${factsResult.title}. ${factsResult.summary}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factsResult]);

  const handleSurprise = useCallback(() => {
    if (mode === 'wiki') {
      const pool = filteredArticles.length > 0 ? filteredArticles : nearbyResult?.articles ?? [];
      if (pool.length === 0) return;
      const pick: NearbyArticle = pool[Math.floor(Math.random() * pool.length)];
      openArticle(pick.url, pick.title);
    } else {
      onSelectCategory('general');
    }
  }, [mode, filteredArticles, nearbyResult, onSelectCategory, openArticle]);

  const handleDownloadArea = useCallback(async () => {
    if (!coords) return;
    setAreaDownloadStatus('downloading');
    try {
      const [label, response] = await Promise.all([
        reverseGeocode(coords).catch(() => null),
        fetchNearbyArticles({ latitude: coords.latitude, longitude: coords.longitude, radiusMiles }),
      ]);
      saveArea({
        id: `area-${Date.now()}`,
        center: coords,
        radiusMiles,
        placeLabel: label,
        downloadedAt: Date.now(),
        articles: response.articles,
      });
      setAreaDownloadStatus('success');
    } catch {
      setAreaDownloadStatus('error');
    }
  }, [coords, radiusMiles, saveArea]);

  return (
    <ThemedView style={styles.container}>
      <RadiusControl />

      {mode === 'wiki' && (
        <ThemedView style={styles.offlineRow}>
          <Pressable
            onPress={handleDownloadArea}
            disabled={!coords || areaDownloadStatus === 'downloading'}
            style={[styles.downloadButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: coords ? 1 : 0.5 }]}>
            <Ionicons
              name={areaDownloadStatus === 'success' ? 'checkmark-circle' : 'cloud-download-outline'}
              size={14}
              color={areaDownloadStatus === 'success' ? theme.accent : theme.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {areaDownloadStatus === 'downloading'
                ? 'Downloading this area…'
                : areaDownloadStatus === 'success'
                  ? 'Area downloaded for offline'
                  : 'Download this area for offline'}
            </ThemedText>
          </Pressable>
          {areaDownloadStatus === 'error' && (
            <ThemedText type="small" themeColor="textSecondary">
              Couldn't download this area — try again.
            </ThemedText>
          )}
        </ThemedView>
      )}

      <ThemedView style={styles.filterRow}>
        <CategoryChips
          categories={mode === 'wiki' ? [ALL_CATEGORY, ...CATEGORIES] : CATEGORIES}
          selected={mode === 'wiki' ? filter : category}
          disabled={!coords}
          onSelect={(id) => (mode === 'wiki' ? setFilter(id as CategoryId | 'all') : onSelectCategory(id as CategoryId))}
        />
        <SurpriseButton disabled={!coords} onPress={handleSurprise} />
      </ThemedView>

      {mode === 'wiki' ? (
        <>
          {isOffline && nearbyStatus === 'success' && (
            <ThemedView style={[styles.offlineBanner, { backgroundColor: theme.backgroundSelected, borderColor: theme.accent }]}>
              <Ionicons name="cloud-offline-outline" size={14} color={theme.accent} />
              <ThemedText type="small" themeColor="textSecondary">
                No connection — showing downloaded content for this area.
              </ThemedText>
            </ThemedView>
          )}
          {nearbyStatus === 'loading' && (
            <ThemedView style={styles.notice}>
              <ActivityIndicator />
              <ThemedText themeColor="textSecondary">Finding what's nearby…</ThemedText>
            </ThemedView>
          )}
          {nearbyStatus === 'error' && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>Couldn't load nearby articles: {nearbyError}</ThemedText>
            </ThemedView>
          )}
          {nearbyStatus === 'success' && nearbyResult && (
            <NearbyArticlesList result={{ ...nearbyResult, articles: filteredArticles }} />
          )}
        </>
      ) : (
        <>
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
        </>
      )}

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
  filterRow: {
    gap: Spacing.two,
  },
  offlineRow: {
    gap: Spacing.one,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    padding: Spacing.two,
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
});
