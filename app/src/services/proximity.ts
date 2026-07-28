import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import { PROXIMITY_CHANNEL_ID, presentNotification } from '@/services/notifications';
import { fetchLocationFacts, fetchNearbyArticles, fetchNearbyPlaces, type NearbyPlace } from '@/services/api';
import { sanitizeForSpeech } from '@/utils/speech-text';

// Must match the storage keys used by use-content-mode.tsx / use-read-preference.tsx — this
// runs from a background task with no React tree, so it reads the same persisted values
// directly instead of going through those hooks/contexts.
const CONTENT_MODE_KEY = 'traveltales:content-mode';
const READ_PREFERENCE_KEY = 'traveltales:read-preference';
const NOTIFIED_STORAGE_KEY = 'traveltales:always-on-notified';

// A tight "you're basically right next to this" radius — separate from the user's browse
// radius setting, since a drive-by ping should only fire for things genuinely nearby.
const PROXIMITY_RADIUS_MILES = 0.6;
// Once notified about a place, don't ping again for it until this much time has passed —
// keeps a slow drive or a stop at the same spot from spamming repeat notifications.
const NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const CHIME_ASSET = require('../../assets/sounds/chime.wav');

interface NotifiedEntry {
  key: string;
  at: number;
}

function placeKey(place: NearbyPlace): string {
  return `place:${place.id}`;
}

async function loadNotified(): Promise<NotifiedEntry[]> {
  const stored = await AsyncStorage.getItem(NOTIFIED_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed: NotifiedEntry[] = JSON.parse(stored);
    const cutoff = Date.now() - NOTIFY_COOLDOWN_MS;
    return parsed.filter((entry) => entry.at >= cutoff);
  } catch {
    return [];
  }
}

async function markNotified(existing: NotifiedEntry[], key: string): Promise<void> {
  const next = [...existing, { key, at: Date.now() }];
  await AsyncStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(next)).catch(() => {
    // Non-fatal: worst case is a repeat notification next time around.
  });
}

async function playChimeThenSpeak(text: string): Promise<void> {
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    try {
      const player = createAudioPlayer(CHIME_ASSET);
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          subscription.remove();
          player.remove();
          finish();
        }
      });
      player.play();
    } catch {
      finish();
    }
    // Safety net in case the chime fails to load or the finish event never fires.
    setTimeout(finish, 2000);
  });
  Speech.speak(sanitizeForSpeech(text), { pitch: 1.07, rate: 1.02 });
}

interface Coords {
  latitude: number;
  longitude: number;
}

export async function checkProximityAndNotify(coords: Coords): Promise<void> {
  const [storedMode, storedReadPreference] = await Promise.all([
    AsyncStorage.getItem(CONTENT_MODE_KEY),
    AsyncStorage.getItem(READ_PREFERENCE_KEY),
  ]);
  const storyMode = storedMode === 'story';
  const autoRead = storedReadPreference === 'voice';

  const notified = await loadNotified();

  let places: NearbyPlace[];
  try {
    const response = await fetchNearbyPlaces({
      latitude: coords.latitude,
      longitude: coords.longitude,
      radiusMiles: PROXIMITY_RADIUS_MILES,
    });
    places = response.places;
  } catch {
    // Offline, backend unreachable, or no Places key configured — Always On mode just
    // quietly does nothing this tick rather than erroring.
    return;
  }

  const candidate = places.find((place) => !notified.some((entry) => entry.key === placeKey(place)));
  if (!candidate) return;

  await markNotified(notified, placeKey(candidate));

  let body = candidate.category ? `${candidate.category} nearby` : "There's something nearby worth a look";
  let speakText = `You're near ${candidate.name}.`;
  let data: Record<string, unknown> = { placeName: candidate.name, latitude: candidate.latitude, longitude: candidate.longitude };

  try {
    if (storyMode) {
      const story = await fetchLocationFacts({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        placeLabel: candidate.name,
        category: 'general',
        radiusMiles: PROXIMITY_RADIUS_MILES,
      });
      if (!story.noVerifiedFactsFound) {
        body = story.summary;
        speakText = `${story.title}. ${story.summary}`;
      }
    } else {
      const nearby = await fetchNearbyArticles({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        radiusMiles: PROXIMITY_RADIUS_MILES,
      });
      const article = nearby.articles[0];
      if (article) {
        body = article.snippet || `Learn about ${article.title}`;
        speakText = `${article.title}. ${article.snippet}`;
        data = { ...data, url: article.url, title: article.title };
      }
    }
  } catch {
    // Fall back to the generic "you're near {place}" text/speech already set above.
  }

  await presentNotification({
    identifier: `proximity-${Date.now()}`,
    title: `📍 ${candidate.name}`,
    body,
    channelId: PROXIMITY_CHANNEL_ID,
    data,
  }).catch(() => {
    // Non-fatal: if notifications aren't permitted, auto-read (if on) still happens below.
  });

  if (autoRead) {
    await playChimeThenSpeak(speakText);
  }
}
