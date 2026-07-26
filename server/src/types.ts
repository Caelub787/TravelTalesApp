export type CategoryId =
  | "history"
  | "culture"
  | "nature"
  | "architecture"
  | "legends"
  | "people"
  | "general";

export interface LocationFactsRequest {
  latitude: number;
  longitude: number;
  placeLabel?: string;
  category: CategoryId;
  radiusMiles?: number;
}

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

export interface AskRequest {
  latitude: number;
  longitude: number;
  placeLabel?: string;
  question: string;
  radiusMiles?: number;
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

export interface AskResponse {
  question: string;
  answer: string;
  locationLabel: string;
  sources: FactSource[];
  noVerifiedAnswerFound: boolean;
}

export interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeResponse {
  label: string | null;
}

export interface AddressSearchResult {
  label: string;
  latitude: number;
  longitude: number;
}

export interface AddressSearchResponse {
  results: AddressSearchResult[];
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
