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
}

export interface AskResponse {
  question: string;
  answer: string;
  locationLabel: string;
  sources: FactSource[];
  noVerifiedAnswerFound: boolean;
}
