import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { useArticleHistory } from '@/hooks/use-article-history';
import { openExternalUrl } from '@/utils/open-external';

interface ArticleViewerArticle {
  url: string;
  title?: string;
}

interface ArticleViewerContextValue {
  article: ArticleViewerArticle | null;
  open: (url: string, title?: string) => void;
  close: () => void;
}

const ArticleViewerContext = createContext<ArticleViewerContextValue | null>(null);

// On web, "opening a source" shows it in an in-app modal (see ArticleViewerModal) instead
// of a new tab, so the user never leaves TravelTales. On native, expo-web-browser's sheet
// already stays within the app process (it overlays rather than backgrounding the app), so
// there's no separate in-app view to build there.
export function ArticleViewerProvider({ children }: { children: ReactNode }) {
  const [article, setArticle] = useState<ArticleViewerArticle | null>(null);
  const { record } = useArticleHistory();

  const open = useCallback(
    (url: string, title?: string) => {
      record({ url, title: title ?? url });
      if (Platform.OS === 'web') {
        setArticle({ url, title });
      } else {
        openExternalUrl(url);
      }
    },
    [record]
  );

  const close = useCallback(() => setArticle(null), []);

  const value = useMemo(() => ({ article, open, close }), [article, open, close]);

  return <ArticleViewerContext.Provider value={value}>{children}</ArticleViewerContext.Provider>;
}

export function useArticleViewer(): ArticleViewerContextValue {
  const context = useContext(ArticleViewerContext);
  if (!context) {
    throw new Error('useArticleViewer must be used within an ArticleViewerProvider');
  }
  return context;
}
