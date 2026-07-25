import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'traveltales:search-radius-miles';

export const RADIUS_OPTIONS_MILES = [1, 5, 10, 15, 25, 50, 100];
export const DEFAULT_RADIUS_MILES = 10;

interface SearchRadiusContextValue {
  radiusMiles: number;
  setRadiusMiles: (miles: number) => void;
}

const SearchRadiusContext = createContext<SearchRadiusContextValue | null>(null);

export function SearchRadiusProvider({ children }: { children: ReactNode }) {
  const [radiusMiles, setRadiusMilesState] = useState<number>(DEFAULT_RADIUS_MILES);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      const parsed = stored ? Number(stored) : NaN;
      if (!Number.isNaN(parsed) && RADIUS_OPTIONS_MILES.includes(parsed)) {
        setRadiusMilesState(parsed);
      }
    });
  }, []);

  const setRadiusMiles = useCallback((miles: number) => {
    setRadiusMilesState(miles);
    AsyncStorage.setItem(STORAGE_KEY, String(miles)).catch(() => {
      // Non-fatal: the setting still applies for this session even if persistence fails.
    });
  }, []);

  return (
    <SearchRadiusContext.Provider value={{ radiusMiles, setRadiusMiles }}>{children}</SearchRadiusContext.Provider>
  );
}

export function useSearchRadius(): SearchRadiusContextValue {
  const context = useContext(SearchRadiusContext);
  if (!context) {
    throw new Error('useSearchRadius must be used within a SearchRadiusProvider');
  }
  return context;
}
