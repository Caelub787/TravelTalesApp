import { fetchGroundingExcerpts, type GroundingExcerpt } from "./wikipedia.js";
import { searchWeb } from "./webSearch.js";
import type {
  AskRequest,
  AskResponse,
  CategoryId,
  FactSource,
  LocationFactsResponse,
  LocationFactsRequest,
} from "../types.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const DEFAULT_RADIUS_MILES = 10;
// A trip download can call this once per sampled stop (dozens to hundreds on a long
// route) — without a cap, one slow completion stalls the entire download.
const GROQ_TIMEOUT_MS = 20000;

const CATEGORY_GUIDANCE: Record<CategoryId, string> = {
  history: "significant historical events, founding dates, wars, or turning points tied to this exact spot",
  culture: "local traditions, festivals, customs, language quirks, or cultural practices tied to this area",
  nature: "geology, native wildlife, plant life, climate, or notable natural features nearby",
  architecture: "notable buildings, architectural styles, landmarks, or design history nearby",
  legends: "folklore, myths, ghost stories, or local legends associated with this area (clearly labeled as legend, not verified fact, but the existence and origin of the legend itself should be sourced)",
  people: "notable people who were born, lived, worked, or are otherwise historically tied to this specific area",
  general: "the single most interesting, well-documented thing about this exact spot, in any category — pick whatever is most noteworthy rather than covering everything shallowly",
};

const CATEGORY_SEARCH_HINT: Record<CategoryId, string> = {
  history: "history",
  culture: "culture and traditions",
  nature: "nature and geology",
  architecture: "architecture and landmarks",
  legends: "legends and folklore",
  people: "notable people",
  general: "interesting facts and recent news",
};

async function groqChat(systemPrompt: string, userMessage: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set on the server.");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    }),
    signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Groq API request failed with status ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq API returned no content");
  }
  return content;
}

function formatExcerpts(excerpts: GroundingExcerpt[]): string {
  return excerpts.map((e, i) => `[${i + 1}] "${e.title}" (${e.url})\n${e.text}`).join("\n\n");
}

// Combines Wikipedia's geosearch (precise, hyper-local) with real open-web search results
// (broader coverage — news, official sites, tourism boards, modern developments) so Story
// Mode isn't limited to whatever Wikipedia happens to have written. Wikipedia's API is the
// reliable, official piece — if it fails, that's a real problem worth surfacing as an error.
// The DuckDuckGo scrape is inherently more fragile, so only that step degrades silently to
// Wikipedia-only grounding instead of masking every failure as "nothing found nearby".
async function gatherGroundingContext(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  searchQuery: string,
  placeLabel?: string
): Promise<GroundingExcerpt[]> {
  const wikiExcerpts = await fetchGroundingExcerpts(latitude, longitude, radiusMiles, placeLabel);

  let webExcerpts: GroundingExcerpt[] = [];
  try {
    const webResults = await searchWeb(searchQuery, 3);
    webExcerpts = webResults.map((result) => ({ title: result.title, text: result.snippet, url: result.url }));
  } catch (err) {
    console.error("Web search failed, continuing with Wikipedia grounding only:", err);
  }

  return [...wikiExcerpts, ...webExcerpts];
}

function noVerifiedFacts(locationLabel: string): LocationFactsResponse {
  return { title: "Nothing verified nearby yet", summary: "", locationLabel, facts: [], noVerifiedFactsFound: true };
}

export async function fetchLocationFacts(req: LocationFactsRequest): Promise<LocationFactsResponse> {
  const { latitude, longitude, placeLabel, category, radiusMiles } = req;
  const fallbackLabel = placeLabel ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  const searchQuery = `${fallbackLabel} ${CATEGORY_SEARCH_HINT[category]}`;
  const excerpts = await gatherGroundingContext(latitude, longitude, radiusMiles ?? DEFAULT_RADIUS_MILES, searchQuery, placeLabel);
  if (excerpts.length === 0) return noVerifiedFacts(fallbackLabel);

  const systemPrompt = `You are a rigorous local guide for a live travel app called TravelTalesApp. Write about ${CATEGORY_GUIDANCE[category]}, using ONLY the numbered excerpts the user provides (a mix of Wikipedia and open-web search results) — never use outside knowledge or invent anything not directly supported by them.

Cover both historical and modern/contemporary angles where the excerpts support it, rather than defaulting only to old history.

Respond with ONLY a JSON object, no other text, matching exactly this shape:
{
  "title": string (short, engaging title),
  "summary": string (2-4 sentence narrative weaving the facts together, conversational, suitable to read aloud),
  "locationLabel": string (the place this content actually describes),
  "noVerifiedFactsFound": boolean,
  "facts": [ { "text": string, "source": { "title": string, "url": string } } ]
}

Every fact's source title and url MUST be copied exactly from one of the numbered excerpts — never invent or alter a URL. If none of the excerpts are relevant to the requested topic, set noVerifiedFactsFound to true and return an empty facts array instead of forcing an unrelated answer.`;

  const userMessage = `Location: ${fallbackLabel}\n\nExcerpts:\n${formatExcerpts(excerpts)}`;

  const raw = await groqChat(systemPrompt, userMessage);
  try {
    const parsed = JSON.parse(raw) as Partial<LocationFactsResponse>;
    if (!parsed.title || !Array.isArray(parsed.facts)) throw new Error("malformed response shape");
    return {
      title: parsed.title,
      summary: parsed.summary ?? "",
      locationLabel: parsed.locationLabel ?? fallbackLabel,
      facts: parsed.facts,
      noVerifiedFactsFound: Boolean(parsed.noVerifiedFactsFound) && parsed.facts.length === 0,
    };
  } catch {
    throw new Error("Model did not return valid structured location facts");
  }
}

export async function answerLocationQuestion(req: AskRequest): Promise<AskResponse> {
  const { latitude, longitude, placeLabel, question, radiusMiles } = req;
  const fallbackLabel = placeLabel ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  const searchQuery = `${fallbackLabel} ${question}`;
  const excerpts = await gatherGroundingContext(latitude, longitude, radiusMiles ?? DEFAULT_RADIUS_MILES, searchQuery, placeLabel);
  if (excerpts.length === 0) {
    return {
      question,
      answer: "Nothing verifiable turned up nearby for that.",
      locationLabel: fallbackLabel,
      sources: [],
      noVerifiedAnswerFound: true,
    };
  }

  const systemPrompt = `You are a rigorous local guide for a live travel app called TravelTalesApp. The user is standing at a specific location and is asking a free-form question about where they are. Answer using ONLY the numbered excerpts provided (a mix of Wikipedia and open-web search results) — never use outside knowledge or invent anything not directly supported by them. This may be read aloud back to the user, so keep it natural to hear.

Respond with ONLY a JSON object, no other text, matching exactly this shape:
{
  "answer": string (direct, conversational answer, 2-6 sentences),
  "locationLabel": string (the place this answer actually describes),
  "noVerifiedAnswerFound": boolean,
  "sources": [ { "title": string, "url": string } ]
}

Every source's title and url MUST be copied exactly from one of the numbered excerpts. If the excerpts don't actually answer the question, set noVerifiedAnswerFound to true, say so honestly in answer, and return an empty sources array rather than guessing.`;

  const userMessage = `Location: ${fallbackLabel}\n\nQuestion: ${question}\n\nExcerpts:\n${formatExcerpts(excerpts)}`;

  const raw = await groqChat(systemPrompt, userMessage);
  try {
    const parsed = JSON.parse(raw) as Partial<AskResponse>;
    if (typeof parsed.answer !== "string" || !Array.isArray(parsed.sources)) {
      throw new Error("malformed response shape");
    }
    return {
      question,
      answer: parsed.answer,
      locationLabel: parsed.locationLabel ?? fallbackLabel,
      sources: parsed.sources as FactSource[],
      noVerifiedAnswerFound: Boolean(parsed.noVerifiedAnswerFound),
    };
  } catch {
    throw new Error("Model did not return a valid structured answer");
  }
}

export async function answerArticleQuestion(req: {
  articleTitle: string;
  articleText: string;
  question: string;
}): Promise<{ answer: string }> {
  const { articleTitle, articleText, question } = req;

  const systemPrompt = `You are a helpful reading companion inside a travel app called TravelTalesApp. The user is reading an article titled "${articleTitle}" and just asked a question about it.

Rules:
- Answer using ONLY the article text provided below — do not use outside knowledge or invent anything.
- If the article doesn't contain the answer, say so honestly instead of guessing.
- Keep the answer conversational and concise (1-4 sentences) — it may be read aloud back to the user.

Respond with ONLY a JSON object, no other text: { "answer": string }

Article text:
"""
${articleText}
"""`;

  const raw = await groqChat(systemPrompt, question);
  try {
    const parsed = JSON.parse(raw) as { answer?: string };
    return { answer: parsed.answer?.trim() || "I couldn't find an answer to that in this article." };
  } catch {
    return { answer: "I couldn't find an answer to that in this article." };
  }
}

export async function synthesizeWikiSearchAnswer(req: {
  question: string;
  excerpts: { title: string; text: string }[];
}): Promise<{ answer: string }> {
  const { question, excerpts } = req;
  const excerptText = excerpts.map((excerpt) => `### ${excerpt.title}\n${excerpt.text}`).join("\n\n");

  const systemPrompt = `You are a helpful local-knowledge search assistant inside a travel app called TravelTalesApp. Answer the user's question using ONLY the Wikipedia excerpts provided below — do not use outside knowledge.

Rules:
- Write a direct, conversational answer (2-5 sentences) that synthesizes the excerpts rather than just repeating them — it may be read aloud back to the user.
- If the excerpts don't actually answer the question, say so honestly rather than forcing an answer.
- Do not fabricate anything not supported by the excerpts.

Respond with ONLY a JSON object, no other text: { "answer": string }

Wikipedia excerpts:
"""
${excerptText}
"""`;

  const raw = await groqChat(systemPrompt, question);
  try {
    const parsed = JSON.parse(raw) as { answer?: string };
    return { answer: parsed.answer?.trim() || "I couldn't find a good answer to that nearby." };
  } catch {
    return { answer: "I couldn't find a good answer to that nearby." };
  }
}
