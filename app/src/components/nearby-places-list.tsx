import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NearbyPlace, NearbyPlacesResponse } from '@/services/api';
import { openDirections } from '@/utils/open-directions';

interface Props {
  result: NearbyPlacesResponse;
}

type IconName = ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICONS: Record<string, IconName> = {
  'Scenic Lookout': 'image-outline',
  'Observation Deck': 'image-outline',
  Park: 'leaf-outline',
  'National Park': 'leaf-outline',
  'State Park': 'leaf-outline',
  'Hiking Area': 'trail-sign-outline',
  Museum: 'business-outline',
  'Historical Landmark': 'time-outline',
  'Historical Place': 'time-outline',
  Monument: 'time-outline',
  'Cultural Landmark': 'color-palette-outline',
  'Art Gallery': 'color-palette-outline',
  Garden: 'flower-outline',
  'Wildlife Park': 'paw-outline',
};

function iconFor(category: NearbyPlace['category']) {
  return CATEGORY_ICONS[category] ?? 'star-outline';
}

export function NearbyPlacesList({ result }: Props) {
  const theme = useTheme();

  if (result.places.length === 0) {
    return null;
  }

  return (
    <ThemedView style={styles.list}>
      <ThemedText type="small" themeColor="textSecondary">
        {result.places.length} nearby destination{result.places.length === 1 ? '' : 's'} & lookouts
      </ThemedText>
      {result.places.map((place) => {
        const info = (
          <ThemedView style={styles.rowMain}>
            <ThemedView style={[styles.icon, { backgroundColor: theme.backgroundSelected }]}>
              <Ionicons name={iconFor(place.category)} size={16} color={theme.accent} />
            </ThemedView>
            <ThemedView style={styles.rowBody}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {place.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {place.category}
                {place.rating ? ` · ★ ${place.rating.toFixed(1)}` : ''}
              </ThemedText>
            </ThemedView>
            {place.mapsUrl && <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />}
          </ThemedView>
        );

        return (
          <ThemedView
            key={place.id}
            type="backgroundElement"
            style={[styles.row, { borderColor: theme.border, shadowColor: theme.text }]}>
            {place.mapsUrl ? (
              <ExternalLink href={place.mapsUrl as `${string}:${string}`} title={place.name}>
                {info}
              </ExternalLink>
            ) : (
              info
            )}
            <Pressable
              onPress={() => openDirections({ latitude: place.latitude, longitude: place.longitude })}
              style={[styles.directionsButton, { borderColor: theme.border }]}
              accessibilityLabel={`Get directions to ${place.name}`}>
              <Ionicons name="navigate-outline" size={14} color={theme.accent} />
              <ThemedText type="small" themeColor="accent">
                Directions
              </ThemedText>
            </Pressable>
          </ThemedView>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
