import type { AddressSearchResponse, ReverseGeocodeRequest, ReverseGeocodeResponse } from "../types.js";

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "TravelTales-App/1.0 (personal project; contact via GitHub)";

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  suburb?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
}

function formatLabel(address: NominatimAddress): string | null {
  const locality = address.city ?? address.town ?? address.village ?? address.hamlet ?? address.suburb ?? address.county;
  const region = address.state ?? address.country;
  const label = [locality, region].filter(Boolean).join(", ");
  return label.length > 0 ? label : null;
}

export async function reverseGeocode(req: ReverseGeocodeRequest): Promise<ReverseGeocodeResponse> {
  const { latitude, longitude } = req;

  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "14");

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Nominatim request failed with status ${response.status}`);
  }

  const data = (await response.json()) as NominatimResponse;
  return { label: data.address ? formatLabel(data.address) : null };
}

interface NominatimSearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export async function searchAddress(query: string): Promise<AddressSearchResponse> {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Nominatim search request failed with status ${response.status}`);
  }

  const data = (await response.json()) as NominatimSearchResult[];
  return {
    results: data.map((item) => ({
      label: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    })),
  };
}
