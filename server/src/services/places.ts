import type { NearbyPlace, NearbyPlacesRequest, NearbyPlacesResponse } from "../types.js";

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby";
const METERS_PER_MILE = 1609.34;
const MAX_RADIUS_METERS = 50000; // Google Places' own hard cap for nearby search.
const DEFAULT_RADIUS_MILES = 5;
const MAX_RESULTS = 12;
// A trip download can call this once per sampled stop (dozens to hundreds on a long
// route) — without a cap, one slow response stalls the entire download.
const REQUEST_TIMEOUT_MS = 10000;

// Place types that read as "destinations, lookouts, and fun things to do" rather than
// everyday errands (gas stations, banks, etc.) — biased toward scenic/historical/cultural
// interest, matching what the rest of the app already surfaces via Wikipedia.
const INCLUDED_TYPES = [
  "tourist_attraction",
  "historical_landmark",
  "historical_place",
  "monument",
  "museum",
  "park",
  "national_park",
  "state_park",
  "hiking_area",
  "scenic_lookout",
  "wildlife_park",
  "garden",
  "art_gallery",
  "cultural_landmark",
  "observation_deck",
];

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  types?: string[];
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
}

interface GooglePlacesResponse {
  places?: GooglePlace[];
}

function pickCategory(types: string[] | undefined): string {
  if (!types) return "Point of interest";
  const match = INCLUDED_TYPES.find((type) => types.includes(type));
  if (!match) return "Point of interest";
  return match
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export async function fetchNearbyPlaces(req: NearbyPlacesRequest): Promise<NearbyPlacesResponse> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set on the server.");
  }

  const { latitude, longitude, radiusMiles } = req;
  const radiusMeters = Math.min(MAX_RADIUS_METERS, (radiusMiles ?? DEFAULT_RADIUS_MILES) * METERS_PER_MILE);

  const response = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.types,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.googleMapsUri",
    },
    body: JSON.stringify({
      includedTypes: INCLUDED_TYPES,
      maxResultCount: MAX_RESULTS,
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: radiusMeters,
        },
      },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google Places request failed with status ${response.status}: ${body}`);
  }

  const data = (await response.json()) as GooglePlacesResponse;
  const places: NearbyPlace[] = (data.places ?? [])
    .filter((place) => place.displayName?.text && place.location)
    .map((place) => ({
      id: place.id,
      name: place.displayName!.text,
      category: pickCategory(place.types),
      address: place.formattedAddress ?? null,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      latitude: place.location!.latitude,
      longitude: place.location!.longitude,
      mapsUrl: place.googleMapsUri ?? null,
    }));

  return { places };
}
