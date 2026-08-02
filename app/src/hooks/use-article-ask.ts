import { useCallback, useState } from 'react';

import type { Coords } from '@/hooks/use-live-location';
import { askAboutArticle, askQuestion, type ArticleAskResponse } from '@/services/api';

export type ArticleAskStatus = 'idle' | 'loading' | 'error' | 'success';

export function useArticleAsk() {
  const [result, setResult] = useState<ArticleAskResponse | null>(null);
  const [status, setStatus] = useState<ArticleAskStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(
    async (
      articleTitle: string,
      articleText: string,
      question: string,
      coords?: Coords | null,
      placeLabel?: string | null
    ) => {
      setStatus('loading');
      setError(null);
      try {
        const response = await askAboutArticle({ articleTitle, articleText, question });
        if (!response.noAnswerFound || !coords) {
          setResult(response);
          setStatus('success');
          return response;
        }

        // The article itself didn't have it — fall back to a general, location-grounded
        // answer (same search used on the Explore screen) instead of leaving the user stuck.
        const fallback = await askQuestion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          placeLabel: placeLabel ?? undefined,
          question,
        });
        const merged: ArticleAskResponse = {
          question,
          answer: fallback.answer,
          noAnswerFound: fallback.noVerifiedAnswerFound,
        };
        setResult(merged);
        setStatus('success');
        return merged;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
        return null;
      }
    },
    []
  );

  return { result, status, error, ask };
}
