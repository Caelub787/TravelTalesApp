import * as TaskManager from 'expo-task-manager';

import { checkProximityAndNotify } from '@/services/proximity';

export const ALWAYS_ON_TASK = 'traveltales-always-on-proximity';

interface LocationTaskData {
  locations: Array<{ coords: { latitude: number; longitude: number } }>;
}

// Defined at module scope so it registers as soon as this file is imported, including when
// Android relaunches the JS engine headlessly just to run this task with the app UI closed.
TaskManager.defineTask(ALWAYS_ON_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = (data as LocationTaskData) ?? { locations: [] };
  const latest = locations[locations.length - 1];
  if (!latest) return;

  await checkProximityAndNotify({ latitude: latest.coords.latitude, longitude: latest.coords.longitude }).catch(() => {
    // A failed proximity check shouldn't take down the background location task.
  });
});
