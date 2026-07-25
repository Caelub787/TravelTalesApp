import { Platform } from 'react-native';

import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

export async function openExternalUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  await openBrowserAsync(url, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
}
