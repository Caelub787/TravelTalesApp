import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveTripView } from '@/components/active-trip-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TripList } from '@/components/trip-list';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useOfflineTrips } from '@/hooks/use-offline-trips';
import { useTheme } from '@/hooks/use-theme';

export default function TripScreenNative() {
  const theme = useTheme();
  const { trips, activeTripId, setActiveTripId } = useOfflineTrips();
  const activeTrip = trips.find((trip) => trip.id === activeTripId) ?? null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {activeTrip ? (
          <ThemedView style={styles.activeWrapper}>
            <ActiveTripView trip={activeTrip} onStop={() => setActiveTripId(null)} />
          </ThemedView>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="title" style={styles.title}>
              Trips
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.notice}>
              <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                Route planning needs the interactive map, which is web-only — plan and download a
                trip on the TravelTales website, then come back here to follow it, even offline.
              </ThemedText>
            </ThemedView>
            <TripList onStart={(trip) => setActiveTripId(trip.id)} />
          </ScrollView>
        )}
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
  activeWrapper: {
    flex: 1,
    width: '100%',
    padding: Spacing.four,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  notice: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  noticeText: {
    flex: 1,
    lineHeight: 20,
  },
});
