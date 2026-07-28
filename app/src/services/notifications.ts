import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Notifications shown while the app is foregrounded still need to actually display (the
// default expo-notifications behavior suppresses them, assuming most apps have their own
// in-app UI for foreground events) — we want the always-on proximity alert and download
// progress to show as real notifications regardless of whether the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const DOWNLOAD_CHANNEL_ID = 'downloads';
export const PROXIMITY_CHANNEL_ID = 'proximity';

let channelsReady: Promise<void> | null = null;

export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelsReady) {
    channelsReady = Promise.all([
      Notifications.setNotificationChannelAsync(DOWNLOAD_CHANNEL_ID, {
        name: 'Downloads',
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
      Notifications.setNotificationChannelAsync(PROXIMITY_CHANNEL_ID, {
        name: 'Nearby attractions',
        importance: Notifications.AndroidImportance.HIGH,
      }),
    ]).then(() => undefined);
  }
  return channelsReady;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

interface PresentOptions {
  identifier: string;
  title: string;
  body: string;
  channelId?: string;
  data?: Record<string, unknown>;
}

export async function presentNotification({ identifier, title, body, channelId, data }: PresentOptions): Promise<void> {
  await ensureNotificationChannels();
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      data: data ?? {},
    },
    trigger: channelId ? { channelId } : null,
  });
}

export async function dismissNotification(identifier: string): Promise<void> {
  await Notifications.dismissNotificationAsync(identifier).catch(() => {
    // Non-fatal: the notification may have already been dismissed by the user.
  });
}
