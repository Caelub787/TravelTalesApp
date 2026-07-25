import { useCallback, useState } from 'react';

import { askQuestion, searchWiki, type AskResponse } from '@/services/api';
import { useContentMode } from '@/hooks/use-content-mode';
import type { Coords } from '@/hooks/use-live-location';
import { useSearchRadius } from '@/hooks/use-search-radius';

export type AskStatus = 'idle' | 'loading' | 'error' | 'success';

export function useAskQuestion() {
  const { mode } = useContentMode();
  const { radiusMiles } = useSearchRadius();
  const [result, setResult] = useState<AskResponse | null>(null);
  const [status, setStatus] = useState<AskStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(
    async (question: string, coords: Coords, placeLabel: string | null) => {
      setStatus('loading');
      setError(null);

      try {
        const request = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          placeLabel: placeLabel ?? undefined,
          question,
          radiusMiles,
        };
        const response = mode === 'wiki' ? await searchWiki(request) : await askQuestion(request);
        setResult(response);
        setStatus('success');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [mode, radiusMiles]
  );

  return { result, status, error, ask };
}
