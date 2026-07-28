import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// Read directly (no context/provider) by both the Settings screen and the background
// proximity task (services/proximity.ts) — the task has no React tree to read a context
// from, so both sides just go straight to AsyncStorage under this same key.
export const READ_FREQUENCY_STORAGE_KEY = 'traveltales:always-on-read-frequency-minutes';
export const READ_FREQUENCY_OPTIONS_MINUTES = [5, 10, 15, 30, 60];
export const DEFAULT_READ_FREQUENCY_MINUTES = 15;

export function useAlwaysOnFrequency() {
  const [frequencyMinutes, setFrequencyMinutesState] = useState<number>(DEFAULT_READ_FREQUENCY_MINUTES);

  useEffect(() => {
    AsyncStorage.getItem(READ_FREQUENCY_STORAGE_KEY).then((stored) => {
      const parsed = stored ? Number(stored) : NaN;
      if (!Number.isNaN(parsed) && READ_FREQUENCY_OPTIONS_MINUTES.includes(parsed)) {
        setFrequencyMinutesState(parsed);
      }
    });
  }, []);

  const setFrequencyMinutes = useCallback((minutes: number) => {
    setFrequencyMinutesState(minutes);
    AsyncStorage.setItem(READ_FREQUENCY_STORAGE_KEY, String(minutes)).catch(() => {
      // Non-fatal: the setting still applies for this session even if persistence fails.
    });
  }, []);

  return { frequencyMinutes, setFrequencyMinutes };
}
