import { useCallback, useState } from 'react';

import { askQuestion, searchWiki, type AskResponse, type NearbyArticle } from '@/services/api';
import { useContentMode } from '@/hooks/use-content-mode';
import type { Coords } from '@/hooks/use-live-location';
import { useOfflineAreas } from '@/hooks/use-offline-areas';
import { useOfflineTrips } from '@/hooks/use-offline-trips';
import { useSearchRadius } from '@/hooks/use-search-radius';
import { findOfflineMatch } from '@/utils/offline-lookup';

export type AskStatus = 'idle' | 'loading' | 'error' | 'success';

function searchOffline(question: string, articles: NearbyArticle[], locationLabel: string): AskResponse {
  const keywords = question.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  const matches = articles.filter((article) => {
    const text = `${article.title} ${article.snippet}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });
  const pool = (matches.length > 0 ? matches : articles).slice(0, 5);

  return {
    question,
    answer:
      pool.length > 0
        ? `You're offline, so here's what's already downloaded for this area:\n\n${pool
            .map((article) => `${article.title}: ${article.snippet}`)
            .join('\n\n')}`
        : "You're offline and nothing downloaded for this area matches that question.",
    locationLabel,
    sources: pool.map((article) => ({ title: article.title, url: article.url })),
    noVerifiedAnswerFound: pool.length === 0,
  };
}

export function useAskQuestion() {
  const { mode } = useContentMode();
  const { radiusMiles } = useSearchRadius();
  const { areas } = useOfflineAreas();
  const { trips } = useOfflineTrips();
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

        if (mode === 'wiki') {
          const wikiResponse = await searchWiki(request);
          if (!wikiResponse.noVerifiedAnswerFound) {
            setResult(wikiResponse);
            setStatus('success');
            return;
          }
          // Nothing on Wikipedia nearby matched — fall back to a full AI-grounded answer
          // (same as Story mode) so Wiki mode still gives a real answer instead of "nothing
          // found," the same way a normal search engine would.
          const aiResponse = await askQuestion(request);
          setResult(aiResponse);
          setStatus('success');
          return;
        }

        const response = await askQuestion(request);
        setResult(response);
        setStatus('success');
      } catch (err) {
        if (mode === 'wiki') {
          const offlineMatch = findOfflineMatch(coords, areas, trips);
          if (offlineMatch && offlineMatch.articles.length > 0) {
            setResult(searchOffline(question, offlineMatch.articles, offlineMatch.placeLabel ?? 'Downloaded area'));
            setStatus('success');
            return;
          }
        }
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [mode, radiusMiles, areas, trips]
  );

  return { result, status, error, ask };
}
