import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Spacing } from '@/constants/theme';
import { useOfflineTrips, type Trip } from '@/hooks/use-offline-trips';
import { useTheme } from '@/hooks/use-theme';

function formatMiles(meters: number): string {
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

interface Props {
  onStart: (trip: Trip) => void;
}

export function TripList({ onStart }: Props) {
  const theme = useTheme();
  const { trips, deleteTrip } = useOfflineTrips();

  if (trips.length === 0) {
    return (
      <ThemedView style={styles.emptyState}>
        <Ionicons name="map-outline" size={32} color={theme.textSecondary} />
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          No downloaded trips yet. Plan a route and download it for offline use — stories
          for every stop along the way will be ready even with no signal.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.list}>
      {trips.map((trip) => (
        <ThemedView
          key={trip.id}
          type="backgroundElement"
          style={[styles.card, { borderColor: theme.border, shadowColor: theme.text }]}>
          <ThemedView style={styles.cardHeader}>
            <Ionicons name="trail-sign-outline" size={18} color={theme.accent} />
            <ThemedText type="smallBold" style={styles.cardTitle}>
              {trip.name}
            </ThemedText>
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            {formatMiles(trip.totalDistanceMeters)} · {trip.stops.length} stop
            {trip.stops.length === 1 ? '' : 's'} downloaded
          </ThemedText>
          <ThemedView style={styles.actionRow}>
            <Pressable onPress={() => onStart(trip)} style={[styles.actionButton, { backgroundColor: theme.accent }]}>
              <Ionicons name="navigate" size={14} color={theme.accentContrast} />
              <ThemedText type="smallBold" themeColor="accentContrast">
                Follow this trip
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => deleteTrip(trip.id)}
              style={[styles.actionButton, { backgroundColor: theme.backgroundSelected }]}>
              <Ionicons name="trash-outline" size={14} color={theme.text} />
              <ThemedText type="smallBold">Delete</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  list: {
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
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
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
});
