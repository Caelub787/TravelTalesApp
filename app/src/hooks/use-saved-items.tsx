import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { AskResponse, LocationFactsResponse } from '@/services/api';

const STORAGE_KEY = 'traveltales:saved-items';

export type SavedItem =
  | { id: string; kind: 'facts'; savedAt: number; data: LocationFactsResponse }
  | { id: string; kind: 'answer'; savedAt: number; data: AskResponse };

interface SavedItemsContextValue {
  items: SavedItem[];
  isSaved: (id: string) => boolean;
  toggleSave: (item: Omit<SavedItem, 'savedAt'>) => void;
}

const SavedItemsContext = createContext<SavedItemsContextValue | null>(null);

export function factsSaveId(result: LocationFactsResponse): string {
  return `facts:${result.locationLabel}:${result.title}`;
}

export function answerSaveId(result: AskResponse): string {
  return `answer:${result.locationLabel}:${result.question}`;
}

export function SavedItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        setItems(JSON.parse(stored));
      } catch {
        // Corrupt/old data — ignore and start fresh rather than crash.
      }
    });
  }, []);

  const persist = useCallback((next: SavedItem[]) => {
    setItems(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Non-fatal: the list still applies for this session even if persistence fails.
    });
  }, []);

  const isSaved = useCallback((id: string) => items.some((item) => item.id === id), [items]);

  const toggleSave = useCallback(
    (item: Omit<SavedItem, 'savedAt'>) => {
      if (items.some((existing) => existing.id === item.id)) {
        persist(items.filter((existing) => existing.id !== item.id));
      } else {
        persist([{ ...item, savedAt: Date.now() } as SavedItem, ...items]);
      }
    },
    [items, persist]
  );

  return (
    <SavedItemsContext.Provider value={{ items, isSaved, toggleSave }}>{children}</SavedItemsContext.Provider>
  );
}

export function useSavedItems(): SavedItemsContextValue {
  const context = useContext(SavedItemsContext);
  if (!context) {
    throw new Error('useSavedItems must be used within a SavedItemsProvider');
  }
  return context;
}
