import { synthesizeWikiSearchAnswer } from "./groqClient.js";
import type {
  ArticleContentResponse,
  AskRequest,
  AskResponse,
  CategoryId,
  FactSource,
  LocationFactsRequest,
  LocationFactsResponse,
  NearbyArticle,
  NearbyArticlesRequest,
  NearbyArticlesResponse,
} from "../types.js";

const API_BASE = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "TravelTales-App/1.0 (personal project; contact via GitHub)";
const DEFAULT_RADIUS_MILES = 10;
const MILES_TO_METERS = 1609.34;
const EARTH_RADIUS_METERS = 6371000;
// The MediaWiki geosearch API caps gsradius at 10000 meters (~6.2 miles) per request, so
// wider radii are covered by sampling multiple search centers and merging the results.
const MAX_GEOSEARCH_RADIUS_METERS = 10000;
const MAX_PAGES = 6;
const MAX_NEARBY_ARTICLES = 40;
// Trip downloads can fire dozens of geosearch+extract calls back to back (one pair per
// route stop), which is enough to trip Wikipedia's anonymous rate limit even well under
// its documented ceiling. Retrying a 429 with backoff lets a long trip download finish
// instead of aborting on the first transient rate limit.
const MAX_RATE_LIMIT_RETRIES = 4;
const RATE_LIMIT_BASE_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 15000;

const CATEGORY_KEYWORDS: Record<Exclude<CategoryId, "general">, string[]> = {
  history: ["history", "historic", "founded", "war", "battle", "century", "established", "colonial", "ancient"],
  culture: ["culture", "festival", "tradition", "cuisine", "music", "art", "religion", "community", "custom"],
  nature: ["park", "river", "mountain", "lake", "forest", "wildlife", "geology", "reserve", "nature", "species", "coast"],
  architecture: ["building", "architecture", "tower", "bridge", "cathedral", "designed", "constructed", "landmark", "monument"],
  legends: ["legend", "myth", "folklore", "ghost", "haunted", "supernatural", "tale"],
  people: ["born", "died", "politician", "artist", "writer", "athlete", "musician", "actor", "scientist"],
  attractions: ["attraction", "landmark", "tourist", "scenic", "viewpoint", "lookout", "overlook", "vista", "sightseeing", "must-see"],
};

interface GeoSearchResult {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
}

interface GeoSearchResultWithDistance extends GeoSearchResult {
  distanceMeters: number;
}

interface ExtractResult {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function wikiFetch<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(API_BASE);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      return response.json() as Promise<T>;
    }
    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt;
      await sleep(delayMs);
      continue;
    }
    throw new Error(`Wikipedia API request failed with status ${response.status}`);
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

// Destination point given a start coordinate, bearing (degrees), and distance (meters).
function destinationPoint(lat: number, lon: number, bearingDegrees: number, distance: number): [number, number] {
  const angularDistance = distance / EARTH_RADIUS_METERS;
  const bearing = toRadians(bearingDegrees);
  const lat1 = toRadians(lat);
  const lon1 = toRadians(lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

/**
 * Search centers to query. For radii within the API's single-call limit this is just the
 * original point; for wider radii it's a ring of points around the center so the combined
 * coverage (each filtered back down to the true requested radius) reaches further than any
 * single geosearch call is allowed to.
 */
function buildSearchCenters(latitude: number, longitude: number, radiusMeters: number): Array<[number, number]> {
  if (radiusMeters <= MAX_GEOSEARCH_RADIUS_METERS) {
    return [[latitude, longitude]];
  }

  const ringDistance = radiusMeters - MAX_GEOSEARCH_RADIUS_METERS * 0.5;
  const centers: Array<[number, number]> = [[latitude, longitude]];
  const ringPoints = 6;
  for (let i = 0; i < ringPoints; i++) {
    centers.push(destinationPoint(latitude, longitude, (360 / ringPoints) * i, ringDistance));
  }
  return centers;
}

function milesToMeters(radiusMiles: number | undefined): number {
  const clamped = Math.min(Math.max(radiusMiles ?? DEFAULT_RADIUS_MILES, 1), 200);
  return clamped * MILES_TO_METERS;
}

// Pure coordinate-radius geosearch finds whatever happens to be geotagged nearest the
// user's *exact* GPS point — for a large named place (a national park, a whole town) that
// can easily be some minor stub article instead of the place's own overview article, since
// Wikipedia geotags a location article at one representative point, not spread across its
// full area. When a reverse-geocoded place name is available, look it up by title too and
// fold it in at the top of the results so "what's nearby" reliably includes the place
// you're actually standing in, not just whatever's closest by raw coordinate.
async function searchPageByTitle(query: string): Promise<GeoSearchResult | null> {
  const data = await wikiFetch<{ query?: { search?: { pageid: number; title: string }[] } }>({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "1",
  });
  const hit = data.query?.search?.[0];
  if (!hit) return null;

  const coordData = await wikiFetch<{
    query?: { pages?: Record<string, { coordinates?: { lat: number; lon: number }[] }> };
  }>({
    action: "query",
    prop: "coordinates",
    pageids: String(hit.pageid),
  });
  const coords = Object.values(coordData.query?.pages ?? {})[0]?.coordinates?.[0];
  // Skip pages with no coordinates (e.g. some abstract/administrative articles) rather
  // than folding one in with fabricated (0, 0) coordinates a "Get Directions" link could
  // pick up.
  if (!coords) return null;

  return { pageid: hit.pageid, title: hit.title, lat: coords.lat, lon: coords.lon };
}

async function geosearchArea(
  latitude: number,
  longitude: number,
  radiusMiles: number | undefined,
  placeLabel?: string
): Promise<GeoSearchResultWithDistance[]> {
  const radiusMeters = milesToMeters(radiusMiles);
  const perCallRadius = Math.min(radiusMeters, MAX_GEOSEARCH_RADIUS_METERS);
  const centers = buildSearchCenters(latitude, longitude, radiusMeters);

  const resultBatches = await Promise.all(
    centers.map(([lat, lon]) =>
      wikiFetch<{ query?: { geosearch?: GeoSearchResult[] } }>({
        action: "query",
        list: "geosearch",
        gscoord: `${lat}|${lon}`,
        gsradius: String(Math.max(perCallRadius, 10)),
        gslimit: "50",
      }).then((data) => data.query?.geosearch ?? [])
    )
  );

  const byId = new Map<number, GeoSearchResultWithDistance>();
  for (const batch of resultBatches) {
    for (const page of batch) {
      if (byId.has(page.pageid)) continue;
      const distance = distanceMeters(latitude, longitude, page.lat, page.lon);
      if (distance <= radiusMeters) {
        byId.set(page.pageid, { ...page, distanceMeters: distance });
      }
    }
  }

  if (placeLabel) {
    try {
      const named = await searchPageByTitle(placeLabel);
      if (named && !byId.has(named.pageid)) {
        byId.set(named.pageid, { ...named, distanceMeters: 0 });
      } else if (named) {
        byId.set(named.pageid, { ...byId.get(named.pageid)!, distanceMeters: 0 });
      }
    } catch (err) {
      console.error("Named-place Wikipedia lookup failed, continuing with geosearch only:", err);
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.distanceMeters - b.distanceMeters);
}

async function fetchExtracts(pageIds: number[], options?: { fullIntro?: boolean }): Promise<ExtractResult[]> {
  if (pageIds.length === 0) return [];

  const params: Record<string, string> = {
    action: "query",
    prop: "extracts|info",
    exintro: "1",
    explaintext: "1",
    inprop: "url",
    pageids: pageIds.join("|"),
  };
  if (!options?.fullIntro) params.exsentences = "3";

  const data = await wikiFetch<{ query?: { pages?: Record<string, ExtractResult> } }>(params);
  return Object.values(data.query?.pages ?? {});
}

function matchesCategory(text: string, category: CategoryId): boolean {
  if (category === "general") return true;
  const keywords = CATEGORY_KEYWORDS[category];
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function toFact(page: ExtractResult): { text: string; source: FactSource } | null {
  if (!page.extract || !page.fullurl) return null;
  return {
    text: page.extract.trim(),
    source: { title: page.title, url: page.fullurl },
  };
}

export async function fetchWikiLocationFacts(req: LocationFactsRequest): Promise<LocationFactsResponse> {
  const { latitude, longitude, placeLabel, category, radiusMiles } = req;

  const nearby = await geosearchArea(latitude, longitude, radiusMiles, placeLabel);
  if (nearby.length === 0) {
    return {
      title: "Nothing nearby on Wikipedia",
      summary: "",
      locationLabel: placeLabel ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      facts: [],
      noVerifiedFactsFound: true,
    };
  }

  const extracts = await fetchExtracts(nearby.map((page) => page.pageid));
  const byId = new Map(extracts.map((page) => [page.pageid, page]));

  const ordered = nearby
    .map((page) => byId.get(page.pageid))
    .filter((page): page is ExtractResult => Boolean(page?.extract));

  const categoryMatched = ordered.filter((page) => matchesCategory(`${page.title} ${page.extract}`, category));
  const chosen = (categoryMatched.length > 0 ? categoryMatched : ordered).slice(0, MAX_PAGES);

  if (chosen.length === 0) {
    return {
      title: "Nothing verified nearby yet",
      summary: "",
      locationLabel: placeLabel ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      facts: [],
      noVerifiedFactsFound: true,
    };
  }

  const facts = chosen.map(toFact).filter((fact): fact is { text: string; source: FactSource } => fact !== null);

  return {
    title: chosen[0].title,
    summary:
      categoryMatched.length > 0
        ? chosen[0].extract!.trim()
        : `Nothing on Wikipedia matched "${category}" specifically nearby, so here's what's closest instead.`,
    locationLabel: placeLabel ?? chosen[0].title,
    facts,
    noVerifiedFactsFound: false,
  };
}

export async function fetchNearbyArticles(req: NearbyArticlesRequest): Promise<NearbyArticlesResponse> {
  const { latitude, longitude, radiusMiles, placeLabel } = req;

  const nearby = (await geosearchArea(latitude, longitude, radiusMiles, placeLabel)).slice(0, MAX_NEARBY_ARTICLES);
  const extracts = await fetchExtracts(nearby.map((page) => page.pageid));
  const byId = new Map(extracts.map((page) => [page.pageid, page]));

  const articles: NearbyArticle[] = [];
  for (const page of nearby) {
    const extract = byId.get(page.pageid);
    if (!extract?.fullurl) continue;
    articles.push({
      title: page.title,
      url: extract.fullurl,
      snippet: extract.extract?.trim() ?? "",
      distanceMeters: Math.round(page.distanceMeters),
      latitude: page.lat,
      longitude: page.lon,
    });
  }

  return {
    locationLabel: articles[0]?.title ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    articles,
  };
}

export async function searchWikiAnswer(req: AskRequest): Promise<AskResponse> {
  const { latitude, longitude, placeLabel, question, radiusMiles } = req;

  const radiusKm = Math.round(milesToMeters(radiusMiles) / 1000);
  const data = await wikiFetch<{ query?: { search?: { title: string; snippet: string; pageid: number }[] } }>({
    action: "query",
    list: "search",
    srsearch: `${question} nearcoord:${radiusKm}km,${latitude},${longitude}`,
    srlimit: "5",
  });

  const results = data.query?.search ?? [];
  if (results.length === 0) {
    return {
      question,
      answer: "Nothing on Wikipedia near here matched that question.",
      locationLabel: placeLabel ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      sources: [],
      noVerifiedAnswerFound: true,
    };
  }

  const extracts = await fetchExtracts(results.map((r) => r.pageid));
  const byId = new Map(extracts.map((page) => [page.pageid, page]));

  const sources: FactSource[] = [];
  const excerpts: { title: string; text: string }[] = [];
  for (const result of results) {
    const page = byId.get(result.pageid);
    if (!page?.fullurl) continue;
    sources.push({ title: page.title, url: page.fullurl });
    const plainSnippet = result.snippet.replace(/<[^>]+>/g, "");
    excerpts.push({ title: page.title, text: page.extract?.trim() || plainSnippet });
  }

  if (excerpts.length === 0) {
    return {
      question,
      answer: "Nothing on Wikipedia near here matched that question.",
      locationLabel: placeLabel ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      sources: [],
      noVerifiedAnswerFound: true,
    };
  }

  // Prefer a synthesized, conversational answer (still grounded only in these excerpts)
  // over a raw snippet dump — but Wiki mode is meant to keep working even without a
  // Groq key configured, so fall back to the snippets themselves if synthesis fails.
  let answer: string;
  try {
    answer = (await synthesizeWikiSearchAnswer({ question, excerpts })).answer;
  } catch (err) {
    console.error("AI synthesis failed, falling back to raw Wikipedia snippets:", err);
    answer = `Here's what nearby Wikipedia articles say:\n\n${excerpts
      .map((e) => `${e.title}: ${e.text}`)
      .join("\n\n")}`;
  }

  return {
    question,
    answer,
    locationLabel: placeLabel ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    sources,
    noVerifiedAnswerFound: false,
  };
}

export async function fetchArticleContent(title: string): Promise<ArticleContentResponse> {
  const data = await wikiFetch<{ query?: { pages?: Record<string, ExtractResult> } }>({
    action: "query",
    prop: "extracts|info",
    exintro: "1",
    explaintext: "1",
    inprop: "url",
    redirects: "1",
    titles: title,
  });

  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page?.extract || !page.fullurl) {
    throw new Error(`No Wikipedia content found for "${title}"`);
  }

  return { title: page.title, extract: page.extract.trim(), url: page.fullurl };
}

export interface GroundingExcerpt {
  title: string;
  text: string;
  url: string;
}

const MAX_GROUNDING_ARTICLES = 5;
// Keeps the combined prompt (Wikipedia + web excerpts, per grounding request) well within
// free-tier tokens-per-minute limits — a handful of uncapped full intros for busy
// locations was easily large enough to trip Groq's free-tier rate limit on a single call.
const MAX_GROUNDING_EXCERPT_CHARS = 800;

// Real, verifiable Wikipedia text for Story Mode's AI to write from — grounding it in
// actual nearby articles instead of the model's own (unverifiable, possibly invented)
// knowledge, and without needing any provider's built-in web-search tool.
export async function fetchGroundingExcerpts(
  latitude: number,
  longitude: number,
  radiusMiles: number | undefined,
  placeLabel?: string
): Promise<GroundingExcerpt[]> {
  const nearby = (await geosearchArea(latitude, longitude, radiusMiles, placeLabel)).slice(0, MAX_GROUNDING_ARTICLES);
  const extracts = await fetchExtracts(
    nearby.map((page) => page.pageid),
    { fullIntro: true }
  );
  const byId = new Map(extracts.map((page) => [page.pageid, page]));

  const excerpts: GroundingExcerpt[] = [];
  for (const page of nearby) {
    const extract = byId.get(page.pageid);
    if (!extract?.extract || !extract.fullurl) continue;
    const text = extract.extract.trim().slice(0, MAX_GROUNDING_EXCERPT_CHARS);
    excerpts.push({ title: extract.title, text, url: extract.fullurl });
  }
  return excerpts;
}
