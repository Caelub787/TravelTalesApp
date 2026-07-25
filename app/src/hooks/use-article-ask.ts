import { useCallback, useState } from 'react';

import { askAboutArticle, type ArticleAskResponse } from '@/services/api';

export type ArticleAskStatus = 'idle' | 'loading' | 'error' | 'success';

export function useArticleAsk() {
  const [result, setResult] = useState<ArticleAskResponse | null>(null);
  const [status, setStatus] = useState<ArticleAskStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (articleTitle: string, articleText: string, question: string) => {
    setStatus('loading');
    setError(null);
    try {
      const response = await askAboutArticle({ articleTitle, articleText, question });
      setResult(response);
      setStatus('success');
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      return null;
    }
  }, []);

  return { result, status, error, ask };
}
