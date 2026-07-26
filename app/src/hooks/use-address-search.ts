import { useEffect, useRef, useState } from 'react';
import { searchAddressApi, type AddressSearchResult } from '@/services/api';

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

export type AddressSearchStatus = 'idle' | 'loading' | 'success' | 'error';

export function useAddressSearch(query: string) {
  const [suggestions, setSuggestions] = useState<AddressSearchResult[]>([]);
  const [status, setStatus] = useState<AddressSearchStatus>('idle');
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      requestIdRef.current += 1;
      setSuggestions([]);
      setStatus('idle');
      return;
    }

    const requestId = ++requestIdRef.current;
    setStatus('loading');

    const timer = setTimeout(() => {
      searchAddressApi(trimmed)
        .then((response) => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions(response.results);
          setStatus('success');
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions([]);
          setStatus('error');
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return { suggestions, status };
}
