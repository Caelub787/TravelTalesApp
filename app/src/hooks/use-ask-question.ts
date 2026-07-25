import { useCallback, useState } from 'react';

import { askQuestion, type AskResponse } from '@/services/api';
import type { Coords } from '@/hooks/use-live-location';

export type AskStatus = 'idle' | 'loading' | 'error' | 'success';

export function useAskQuestion() {
  const [result, setResult] = useState<AskResponse | null>(null);
  const [status, setStatus] = useState<AskStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (question: string, coords: Coords, placeLabel: string | null) => {
    setStatus('loading');
    setError(null);

    try {
      const response = await askQuestion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        placeLabel: placeLabel ?? undefined,
        question,
      });
      setResult(response);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  return { result, status, error, ask };
}
