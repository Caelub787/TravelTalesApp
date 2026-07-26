import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { SpeakButton } from '@/components/speak-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Spacing } from '@/constants/theme';
import { useArticleViewer } from '@/hooks/use-article-viewer';
import { useLiveLocation } from '@/hooks/use-live-location';
import type { Trip, TripStop } from '@/hooks/use-offline-trips';
import { useReadPreference } from '@/hooks/use-read-preference';
import { useSpeakable } from '@/hooks/use-speakable';
import { useTheme } from '@/hooks/use-theme';
import { distanceMeters } from '@/utils/distance';

const NEARBY_THRESHOLD_METERS = 400;

function formatMiles(meters: number): string {
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

interface Props {
  trip: Trip;
  onStop: () => void;
}

export function ActiveTripView({ trip, onStop }: Props) {
  const theme = useTheme();
  const { coords, permission } = useLiveLocation();
  const { preference } = useReadPreference();
  const { speak } = useSpeakable();
  const { open: openArticle } = useArticleViewer();
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [nearby, setNearby] = useState<{ stop: TripStop; index: number } | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!coords) return;
    let closest: { stop: TripStop; index: number; distance: number } | null = null;
    for (let index = 0; index < trip.stops.length; index++) {
      const stop = trip.stops[index];
      const distance = distanceMeters(coords, stop);
      if (distance <= NEARBY_THRESHOLD_METERS && !visited.has(index) && (!closest || distance < closest.distance)) {
        closest = { stop, index, distance };
      }
    }
    if (closest) {
      const { stop, index } = closest;
      setNearby({ stop, index });
      setExpandedIndex(index);
      setVisited((prev) => new Set(prev).add(index));
      if (preference === 'voice' && stop.articles[0]) {
        speak(`You're near ${stop.placeLabel ?? 'a stop on your trip'}. ${stop.articles[0].snippet}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerText}>
          <ThemedText type="subtitle" style={styles.title}>
            {trip.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatMiles(trip.totalDistanceMeters)} · {visited.size}/{trip.stops.length} stops passed
          </ThemedText>
        </ThemedView>
        <Pressable onPress={onStop} style={[styles.stopButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Ionicons name="close" size={16} color={theme.text} />
          <ThemedText type="smallBold">Stop</ThemedText>
        </Pressable>
      </ThemedView>

      {permission !== 'granted' && (
        <ThemedView type="backgroundElement" style={styles.notice}>
          <ThemedText themeColor="textSecondary">
            Location access is needed to detect when you're near a stop.
          </ThemedText>
        </ThemedView>
      )}

      {nearby && (
        <ThemedView style={[styles.nearbyBanner, { backgroundColor: theme.backgroundSelected, borderColor: theme.accent }]}>
          <Ionicons name="location" size={16} color={theme.accent} />
          <ThemedText type="smallBold" style={styles.nearbyText}>
            You're near {nearby.stop.placeLabel ?? 'a stop on your trip'}
          </ThemedText>
        </ThemedView>
      )}

      <ScrollView contentContainerStyle={styles.stopList}>
        {trip.stops.map((stop, index) => {
          const expanded = expandedIndex === index;
          return (
            <ThemedView
              key={index}
              type="backgroundElement"
              style={[styles.stopCard, { borderColor: visited.has(index) ? theme.accent : theme.border, shadowColor: theme.text }]}>
              <Pressable onPress={() => setExpandedIndex(expanded ? null : index)} style={styles.stopHeader}>
                <Ionicons
                  name={visited.has(index) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={visited.has(index) ? theme.accent : theme.textSecondary}
                />
                <ThemedView style={styles.stopHeaderText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {stop.placeLabel ?? `${stop.latitude.toFixed(3)}, ${stop.longitude.toFixed(3)}`}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatMiles(stop.distanceAlongRouteMeters)} into the trip · {stop.articles.length} article
                    {stop.articles.length === 1 ? '' : 's'}
                  </ThemedText>
                </ThemedView>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
              </Pressable>

              {expanded && (
                <ThemedView style={styles.stopBody}>
                  {stop.articles.length > 0 && (
                    <SpeakButton text={`${stop.placeLabel ?? ''}. ${stop.articles.map((a) => a.snippet).join(' ')}`} />
                  )}
                  {stop.articles.map((article, articleIndex) => (
                    <Pressable key={articleIndex} onPress={() => openArticle(article.url, article.title)}>
                      <ThemedView style={styles.articleRow}>
                        <Ionicons name="document-text-outline" size={14} color={theme.accent} />
                        <ThemedView style={styles.articleTextColumn}>
                          <ThemedText type="smallBold">{article.title}</ThemedText>
                          {article.snippet.length > 0 && (
                            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                              {article.snippet}
                            </ThemedText>
                          )}
                        </ThemedView>
                      </ThemedView>
                    </Pressable>
                  ))}
                </ThemedView>
              )}
            </ThemedView>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  nearbyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    padding: Spacing.three,
  },
  nearbyText: {
    flex: 1,
  },
  stopList: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  stopCard: {
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    padding: Spacing.three,
    gap: Spacing.two,
    ...CardShadow,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stopHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  stopBody: {
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  articleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  articleTextColumn: {
    flex: 1,
    gap: Spacing.half,
  },
});
