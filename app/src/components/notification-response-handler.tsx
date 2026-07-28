import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { useArticleViewer } from '@/hooks/use-article-viewer';

interface ProximityNotificationData {
  url?: string;
  title?: string;
}

// Handles both a live tap (app already running) and a cold launch from tapping a
// notification — useLastNotificationResponse covers both, re-firing whenever a new
// response comes in.
export function NotificationResponseHandler() {
  const { open } = useArticleViewer();
  const response = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handledId.current === id) return;
    handledId.current = id;

    const data = response.notification.request.content.data as ProximityNotificationData | undefined;
    if (data?.url) {
      open(data.url, data.title);
    }
  }, [response, open]);

  return null;
}
