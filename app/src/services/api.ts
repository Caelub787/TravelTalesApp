import type { CategoryId } from '@/constants/categories';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface FactSource {
  title: string;
  url: string;
}

export interface LocationFact {
  text: string;
  source: FactSource;
}

export interface LocationFactsResponse {
  title: string;
  summary: string;
  locationLabel: string;
  facts: LocationFact[];
  noVerifiedFactsFound: boolean;
}

export interface LocationFactsRequest {
  latitude: number;
  longitude: number;
  placeLabel?: string;
  category: CategoryId;
}

export interface AskRequest {
  latitude: number;
  longitude: number;
  placeLabel?: string;
  question: string;
}

export interface AskResponse {
  question: string;
  answer: string;
  locationLabel: string;
  sources: FactSource[];
  noVerifiedAnswerFound: boolean;
}

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  if (!API_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Point it at your running TravelTales server (see README).'
    );
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => null);
    throw new Error(responseBody?.error ?? `Request failed with status ${response.status}`);
  }

  return response.json();
}

export function fetchLocationFacts(req: LocationFactsRequest): Promise<LocationFactsResponse> {
  return postJson<LocationFactsResponse>('/api/location-facts', req);
}

export function askQuestion(req: AskRequest): Promise<AskResponse> {
  return postJson<AskResponse>('/api/ask', req);
}

export function fetchWikiFacts(req: LocationFactsRequest): Promise<LocationFactsResponse> {
  return postJson<LocationFactsResponse>('/api/wiki-facts', req);
}

export function searchWiki(req: AskRequest): Promise<AskResponse> {
  return postJson<AskResponse>('/api/wiki-search', req);
}
