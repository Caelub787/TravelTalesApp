import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ContentMode = 'story' | 'wiki';

const STORAGE_KEY = 'traveltales:content-mode';

interface ContentModeContextValue {
  mode: ContentMode;
  setMode: (mode: ContentMode) => void;
}

const ContentModeContext = createContext<ContentModeContextValue | null>(null);

export function ContentModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ContentMode>('wiki');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'story' || stored === 'wiki') {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = useCallback((next: ContentMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Non-fatal: the mode still applies for this session even if persistence fails.
    });
  }, []);

  return <ContentModeContext.Provider value={{ mode, setMode }}>{children}</ContentModeContext.Provider>;
}

export function useContentMode(): ContentModeContextValue {
  const context = useContext(ContentModeContext);
  if (!context) {
    throw new Error('useContentMode must be used within a ContentModeProvider');
  }
  return context;
}
