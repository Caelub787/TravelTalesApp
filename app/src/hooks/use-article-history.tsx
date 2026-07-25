import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'traveltales:article-history';
const MAX_HISTORY_ITEMS = 50;

export interface HistoryEntry {
  url: string;
  title: string;
  viewedAt: number;
}

interface ArticleHistoryContextValue {
  items: HistoryEntry[];
  record: (entry: Omit<HistoryEntry, 'viewedAt'>) => void;
  clear: () => void;
}

const ArticleHistoryContext = createContext<ArticleHistoryContextValue | null>(null);

export function ArticleHistoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<HistoryEntry[]>([]);

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

  const persist = useCallback((next: HistoryEntry[]) => {
    setItems(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Non-fatal: history still applies for this session even if persistence fails.
    });
  }, []);

  const record = useCallback(
    (entry: Omit<HistoryEntry, 'viewedAt'>) => {
      const deduped = items.filter((item) => item.url !== entry.url);
      persist([{ ...entry, viewedAt: Date.now() }, ...deduped].slice(0, MAX_HISTORY_ITEMS));
    },
    [items, persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  return (
    <ArticleHistoryContext.Provider value={{ items, record, clear }}>{children}</ArticleHistoryContext.Provider>
  );
}

export function useArticleHistory(): ArticleHistoryContextValue {
  const context = useContext(ArticleHistoryContext);
  if (!context) {
    throw new Error('useArticleHistory must be used within an ArticleHistoryProvider');
  }
  return context;
}
