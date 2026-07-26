import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Coords } from '@/hooks/use-live-location';
import type { NearbyArticle } from '@/services/api';

const STORAGE_KEY = 'traveltales:offline-areas';

export interface OfflineArea {
  id: string;
  center: Coords;
  radiusMiles: number;
  placeLabel: string | null;
  downloadedAt: number;
  articles: NearbyArticle[];
}

interface OfflineAreasContextValue {
  areas: OfflineArea[];
  saveArea: (area: OfflineArea) => void;
  deleteArea: (id: string) => void;
}

const OfflineAreasContext = createContext<OfflineAreasContextValue | null>(null);

export function OfflineAreasProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<OfflineArea[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        setAreas(JSON.parse(stored));
      } catch {
        // Corrupt/old data — ignore and start fresh rather than crash.
      }
    });
  }, []);

  const persist = useCallback((next: OfflineArea[]) => {
    setAreas(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Non-fatal: the area still applies for this session even if persistence fails.
    });
  }, []);

  const saveArea = useCallback(
    (area: OfflineArea) => {
      persist([area, ...areas.filter((existing) => existing.id !== area.id)]);
    },
    [areas, persist]
  );

  const deleteArea = useCallback(
    (id: string) => {
      persist(areas.filter((existing) => existing.id !== id));
    },
    [areas, persist]
  );

  return (
    <OfflineAreasContext.Provider value={{ areas, saveArea, deleteArea }}>{children}</OfflineAreasContext.Provider>
  );
}

export function useOfflineAreas(): OfflineAreasContextValue {
  const context = useContext(OfflineAreasContext);
  if (!context) {
    throw new Error('useOfflineAreas must be used within an OfflineAreasProvider');
  }
  return context;
}
