import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { requestNotificationPermission } from '@/services/notifications';
import { ALWAYS_ON_TASK } from '@/tasks/always-on-task';

const STORAGE_KEY = 'traveltales:always-on-mode';

interface AlwaysOnModeContextValue {
  enabled: boolean;
  loading: boolean;
  error: string | null;
  setEnabled: (next: boolean) => Promise<void>;
}

const AlwaysOnModeContext = createContext<AlwaysOnModeContextValue | null>(null);

async function startTracking(): Promise<void> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Location permission is required for Always On mode.');
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Background location permission is required so Always On mode keeps working while the app isn't open.");
  }
  await requestNotificationPermission();

  await Location.startLocationUpdatesAsync(ALWAYS_ON_TASK, {
    accuracy: Location.LocationAccuracy.Balanced,
    timeInterval: 45000,
    distanceInterval: 300,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Travel Tales is watching for nearby stories',
      notificationBody: "Always On mode is active — you'll get a notification near attractions and historical sites.",
    },
  });
}

export function AlwaysOnModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored !== 'true') {
        setLoading(false);
        return;
      }

      // Re-sync with the OS task state in case permissions were revoked from device
      // settings since this was last turned on.
      const actuallyRunning = await Location.hasStartedLocationUpdatesAsync(ALWAYS_ON_TASK).catch(() => false);
      if (actuallyRunning) {
        setEnabledState(true);
      } else {
        try {
          await startTracking();
          setEnabledState(true);
        } catch {
          await AsyncStorage.setItem(STORAGE_KEY, 'false').catch(() => {});
        }
      }
      setLoading(false);
    })();
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    setError(null);
    if (next) {
      try {
        await startTracking();
        setEnabledState(true);
        await AsyncStorage.setItem(STORAGE_KEY, 'true');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setEnabledState(false);
      }
    } else {
      await Location.stopLocationUpdatesAsync(ALWAYS_ON_TASK).catch(() => {});
      setEnabledState(false);
      await AsyncStorage.setItem(STORAGE_KEY, 'false').catch(() => {});
    }
  }, []);

  return (
    <AlwaysOnModeContext.Provider value={{ enabled, loading, error, setEnabled }}>
      {children}
    </AlwaysOnModeContext.Provider>
  );
}

export function useAlwaysOnMode(): AlwaysOnModeContextValue {
  const context = useContext(AlwaysOnModeContext);
  if (!context) {
    throw new Error('useAlwaysOnMode must be used within an AlwaysOnModeProvider');
  }
  return context;
}
