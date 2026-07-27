import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'traveltales:offline-articles';

export interface OfflineArticle {
  url: string;
  title: string;
  extract: string;
  downloadedAt: number;
}

interface OfflineArticlesContextValue {
  articles: OfflineArticle[];
  saveArticle: (article: OfflineArticle) => void;
  deleteArticle: (url: string) => void;
  findByUrl: (url: string) => OfflineArticle | null;
}

const OfflineArticlesContext = createContext<OfflineArticlesContextValue | null>(null);

export function OfflineArticlesProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<OfflineArticle[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        setArticles(JSON.parse(stored));
      } catch {
        // Corrupt/old data — ignore and start fresh rather than crash.
      }
    });
  }, []);

  const persist = useCallback((next: OfflineArticle[]) => {
    setArticles(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Non-fatal: the download still applies for this session even if persistence fails.
    });
  }, []);

  const saveArticle = useCallback(
    (article: OfflineArticle) => {
      persist([article, ...articles.filter((existing) => existing.url !== article.url)]);
    },
    [articles, persist]
  );

  const deleteArticle = useCallback(
    (url: string) => {
      persist(articles.filter((existing) => existing.url !== url));
    },
    [articles, persist]
  );

  const findByUrl = useCallback(
    (url: string) => articles.find((article) => article.url === url) ?? null,
    [articles]
  );

  return (
    <OfflineArticlesContext.Provider value={{ articles, saveArticle, deleteArticle, findByUrl }}>
      {children}
    </OfflineArticlesContext.Provider>
  );
}

export function useOfflineArticles(): OfflineArticlesContextValue {
  const context = useContext(OfflineArticlesContext);
  if (!context) {
    throw new Error('useOfflineArticles must be used within an OfflineArticlesProvider');
  }
  return context;
}
