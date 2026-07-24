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

export async function fetchLocationFacts(req: LocationFactsRequest): Promise<LocationFactsResponse> {
  if (!API_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Point it at your running TravelTales server (see README).'
    );
  }

  const response = await fetch(`${API_URL}/api/location-facts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }

  return response.json();
}
