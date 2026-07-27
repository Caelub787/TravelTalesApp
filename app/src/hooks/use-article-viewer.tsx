import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useArticleHistory } from '@/hooks/use-article-history';

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

// "Opening a source" always shows it in a themed in-app modal (see ArticleViewerModal) on
// every platform — web renders it in a DOM modal, native in a React Native <Modal> — so the
// user never leaves the app, and downloaded articles/areas/trips can be read the same way
// with no connection.
export function ArticleViewerProvider({ children }: { children: ReactNode }) {
  const [article, setArticle] = useState<ArticleViewerArticle | null>(null);
  const { record } = useArticleHistory();

  const open = useCallback(
    (url: string, title?: string) => {
      record({ url, title: title ?? url });
      setArticle({ url, title });
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
