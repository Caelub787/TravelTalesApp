import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ReadPreference = 'text' | 'voice';

const STORAGE_KEY = 'traveltales:read-preference';

interface ReadPreferenceContextValue {
  preference: ReadPreference;
  setPreference: (preference: ReadPreference) => void;
}

const ReadPreferenceContext = createContext<ReadPreferenceContextValue | null>(null);

export function ReadPreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ReadPreference>('text');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'text' || stored === 'voice') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = useCallback((next: ReadPreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Non-fatal: the preference still applies for this session even if persistence fails.
    });
  }, []);

  return (
    <ReadPreferenceContext.Provider value={{ preference, setPreference }}>{children}</ReadPreferenceContext.Provider>
  );
}

export function useReadPreference(): ReadPreferenceContextValue {
  const context = useContext(ReadPreferenceContext);
  if (!context) {
    throw new Error('useReadPreference must be used within a ReadPreferenceProvider');
  }
  return context;
}
