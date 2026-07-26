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
  radiusMiles?: number;
}

export interface AskRequest {
  latitude: number;
  longitude: number;
  placeLabel?: string;
  question: string;
  radiusMiles?: number;
}

export interface AskResponse {
  question: string;
  answer: string;
  locationLabel: string;
  sources: FactSource[];
  noVerifiedAnswerFound: boolean;
}

export interface NearbyArticlesRequest {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
}

export interface NearbyArticle {
  title: string;
  url: string;
  snippet: string;
  distanceMeters: number;
}

export interface NearbyArticlesResponse {
  locationLabel: string;
  articles: NearbyArticle[];
}

export interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeResponse {
  label: string | null;
}

export interface ArticleContentRequest {
  title: string;
}

export interface ArticleContentResponse {
  title: string;
  extract: string;
  url: string;
}

export interface ArticleAskRequest {
  articleTitle: string;
  articleText: string;
  question: string;
}

export interface ArticleAskResponse {
  question: string;
  answer: string;
}

export interface AddressSearchResult {
  label: string;
  latitude: number;
  longitude: number;
}

export interface AddressSearchResponse {
  results: AddressSearchResult[];
}

function requireApiUrl(): string {
  if (!API_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Point it at your running TravelTales server (see README).'
    );
  }
  return API_URL;
}

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${requireApiUrl()}${path}`, {
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

async function getJson<TResponse>(path: string, params: Record<string, string>): Promise<TResponse> {
  const url = new URL(`${requireApiUrl()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);
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

export function fetchNearbyArticles(req: NearbyArticlesRequest): Promise<NearbyArticlesResponse> {
  return postJson<NearbyArticlesResponse>('/api/wiki-nearby', req);
}

export function reverseGeocodeApi(req: ReverseGeocodeRequest): Promise<ReverseGeocodeResponse> {
  return getJson<ReverseGeocodeResponse>('/api/reverse-geocode', {
    latitude: String(req.latitude),
    longitude: String(req.longitude),
  });
}

export function fetchArticleContent(req: ArticleContentRequest): Promise<ArticleContentResponse> {
  return postJson<ArticleContentResponse>('/api/article-content', req);
}

export function askAboutArticle(req: ArticleAskRequest): Promise<ArticleAskResponse> {
  return postJson<ArticleAskResponse>('/api/article-ask', req);
}

export function searchAddressApi(query: string): Promise<AddressSearchResponse> {
  return getJson<AddressSearchResponse>('/api/address-search', { q: query });
}
