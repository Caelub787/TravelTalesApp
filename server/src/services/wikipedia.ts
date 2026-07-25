import type { AskRequest, AskResponse, CategoryId, FactSource, LocationFactsRequest, LocationFactsResponse } from "../types.js";

const API_BASE = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "TravelTales-App/1.0 (personal project; contact via GitHub)";
const SEARCH_RADIUS_METERS = 8000;
const MAX_PAGES = 6;

const CATEGORY_KEYWORDS: Record<Exclude<CategoryId, "general">, string[]> = {
  history: ["history", "historic", "founded", "war", "battle", "century", "established", "colonial", "ancient"],
  culture: ["culture", "festival", "tradition", "cuisine", "music", "art", "religion", "community", "custom"],
  nature: ["park", "river", "mountain", "lake", "forest", "wildlife", "geology", "reserve", "nature", "species", "coast"],
  architecture: ["building", "architecture", "tower", "bridge", "cathedral", "designed", "constructed", "landmark", "monument"],
  legends: ["legend", "myth", "folklore", "ghost", "haunted", "supernatural", "tale"],
  people: ["born", "died", "politician", "artist", "writer", "athlete", "musician", "actor", "scientist"],
};

interface GeoSearchResult {
  pageid: number;
  title: string;
  dist: number;
}

interface ExtractResult {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
}

async function wikiFetch<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(API_BASE);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Wikipedia API request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function geosearch(latitude: number, longitude: number): Promise<GeoSearchResult[]> {
  const data = await wikiFetch<{ query?: { geosearch?: GeoSearchResult[] } }>({
    action: "query",
    list: "geosearch",
    gscoord: `${latitude}|${longitude}`,
    gsradius: String(SEARCH_RADIUS_METERS),
    gslimit: String(MAX_PAGES * 3),
  });
  return data.query?.geosearch ?? [];
}

async function fetchExtracts(pageIds: number[]): Promise<ExtractResult[]> {
  if (pageIds.length === 0) return [];

  const data = await wikiFetch<{ query?: { pages?: Record<string, ExtractResult> } }>({
    action: "query",
    prop: "extracts|info",
    exintro: "1",
    explaintext: "1",
    exsentences: "3",
    inprop: "url",
    pageids: pageIds.join("|"),
  });
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
  const { latitude, longitude, placeLabel, category } = req;

  const nearby = await geosearch(latitude, longitude);
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

export async function searchWikiAnswer(req: AskRequest): Promise<AskResponse> {
  const { latitude, longitude, placeLabel, question } = req;

  const data = await wikiFetch<{ query?: { search?: { title: string; snippet: string; pageid: number }[] } }>({
    action: "query",
    list: "search",
    srsearch: `${question} nearcoord:${SEARCH_RADIUS_METERS / 1000}km,${latitude},${longitude}`,
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
  const snippets: string[] = [];
  for (const result of results) {
    const page = byId.get(result.pageid);
    if (!page?.fullurl) continue;
    sources.push({ title: page.title, url: page.fullurl });
    const plainSnippet = result.snippet.replace(/<[^>]+>/g, "");
    snippets.push(`${page.title}: ${plainSnippet}…`);
  }

  return {
    question,
    answer:
      snippets.length > 0
        ? `Here's what nearby Wikipedia articles say:\n\n${snippets.join("\n\n")}`
        : "Nothing on Wikipedia near here matched that question.",
    locationLabel: placeLabel ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    sources,
    noVerifiedAnswerFound: sources.length === 0,
  };
}
