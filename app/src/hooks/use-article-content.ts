import { useCallback, useState } from 'react';

import { fetchArticleContent, type ArticleContentResponse } from '@/services/api';

export type ArticleContentStatus = 'idle' | 'loading' | 'error' | 'success';

export function useArticleContent() {
  const [result, setResult] = useState<ArticleContentResponse | null>(null);
  const [status, setStatus] = useState<ArticleContentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (title: string) => {
    setStatus('loading');
    setError(null);
    setResult(null);
    try {
      const response = await fetchArticleContent({ title });
      setResult(response);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  return { result, status, error, load };
}
