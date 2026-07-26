// Free, keyless web search via DuckDuckGo's no-JS HTML results page — there's no free,
// keyless equivalent of Google/Bing's search APIs, so this is what lets Story Mode research
// the open web (not just Wikipedia) without requiring another account/API key/bill.
const SEARCH_URL = "https://html.duckduckgo.com/html/";
const USER_AGENT = "Mozilla/5.0 (compatible; TravelTalesApp/1.0; +personal project)";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

function stripHtml(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function resolveResultUrl(href: string): string | null {
  // DuckDuckGo's HTML results wrap the real URL like /l/?uddg=<encoded-url>&...
  try {
    const url = new URL(href, "https://duckduckgo.com");
    const real = url.searchParams.get("uddg");
    return real ? decodeURIComponent(real) : url.toString();
  } catch {
    return null;
  }
}

const RESULT_PATTERN =
  /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

export async function searchWeb(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", query);

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Web search request failed with status ${response.status}`);
  }
  const html = await response.text();

  const results: WebSearchResult[] = [];
  const pattern = new RegExp(RESULT_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while (results.length < maxResults && (match = pattern.exec(html))) {
    const [, rawUrl, rawTitle, rawSnippet] = match;
    const resolvedUrl = resolveResultUrl(rawUrl);
    if (!resolvedUrl) continue;
    results.push({ url: resolvedUrl, title: stripHtml(rawTitle), snippet: stripHtml(rawSnippet) });
  }
  return results;
}
