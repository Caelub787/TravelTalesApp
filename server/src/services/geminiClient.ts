import { GoogleGenAI, type FunctionDeclaration, type Tool } from "@google/genai";
import type {
  AskRequest,
  AskResponse,
  CategoryId,
  LocationFactsRequest,
  LocationFactsResponse,
} from "../types.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
const DEFAULT_RADIUS_MILES = 10;

const CATEGORY_GUIDANCE: Record<CategoryId, string> = {
  history: "significant historical events, founding dates, wars, or turning points tied to this exact spot",
  culture: "local traditions, festivals, customs, language quirks, or cultural practices tied to this area",
  nature: "geology, native wildlife, plant life, climate, or notable natural features nearby",
  architecture: "notable buildings, architectural styles, landmarks, or design history nearby",
  legends: "folklore, myths, ghost stories, or local legends associated with this area (clearly labeled as legend, not verified fact, but the existence and origin of the legend itself should be sourced)",
  people: "notable people who were born, lived, worked, or are otherwise historically tied to this specific area",
  general: "the single most interesting, well-documented thing about this exact spot, in any category — pick whatever is most noteworthy rather than covering everything shallowly",
};

const googleSearchTool: Tool = { googleSearch: {} };

const RETURN_FACTS_FUNCTION_NAME = "return_location_facts";

const returnLocationFactsDeclaration: FunctionDeclaration = {
  name: RETURN_FACTS_FUNCTION_NAME,
  description:
    "Return the final, verified location facts/story payload to show the user. Call this exactly once, after searching, as your final action.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short, engaging title for this story/fact set" },
      summary: { type: "string", description: "2-4 sentence narrative summary weaving the facts together" },
      locationLabel: {
        type: "string",
        description:
          "The place this content actually describes (e.g. 'Fremont Street, Las Vegas' or, if nothing hyper-local was found, the broader city/region actually used)",
      },
      noVerifiedFactsFound: {
        type: "boolean",
        description: "True if search turned up no verifiable facts for this location/category, even at a broader radius",
      },
      facts: {
        type: "array",
        description: "Individual facts, each grounded in a real search result. Empty if noVerifiedFactsFound is true.",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "A single, specific, verifiable fact or story beat" },
            source: {
              type: "object",
              properties: {
                title: { type: "string", description: "Title of the source page" },
                url: { type: "string", description: "URL of the source, must come from an actual search result" },
              },
              required: ["title", "url"],
            },
          },
          required: ["text", "source"],
        },
      },
    },
    required: ["title", "summary", "locationLabel", "noVerifiedFactsFound", "facts"],
  },
};

function buildSystemPrompt(category: CategoryId): string {
  return `You are a rigorous local guide for a live travel app called TravelTales. A user is standing at a specific GPS location right now and wants ${CATEGORY_GUIDANCE[category]}.

Rules:
- Use Google Search grounding to find real, current sources before writing anything. Do not rely on your own memory for facts — verify everything through search.
- Every fact you report must be traceable to a specific search result. Include the real title and URL of that result as the source.
- Stay as hyper-local as possible to the given coordinates. Only broaden to the surrounding neighborhood, city, or region if nothing verifiable exists for the exact spot — and if you do, say so honestly via locationLabel and keep facts relevant to that broader area.
- If you genuinely cannot find any verifiable facts even at a broader radius, set noVerifiedFactsFound to true and return an empty facts array rather than inventing content.
- Never fabricate a source URL. If you are not confident a URL came from your search results, leave that fact out.
- Finish by calling the ${RETURN_FACTS_FUNCTION_NAME} function exactly once with the final structured result. Do not include any other prose in your final turn.`;
}

export async function fetchLocationFacts(req: LocationFactsRequest): Promise<LocationFactsResponse> {
  const { latitude, longitude, placeLabel, category, radiusMiles } = req;

  const userMessage = `Current GPS coordinates: ${latitude}, ${longitude}${
    placeLabel ? ` (approximate place: ${placeLabel})` : ""
  }. Category requested: ${category}. Search radius: stay within approximately ${
    radiusMiles ?? DEFAULT_RADIUS_MILES
  } miles of these coordinates.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userMessage,
    config: {
      systemInstruction: buildSystemPrompt(category),
      tools: [googleSearchTool, { functionDeclarations: [returnLocationFactsDeclaration] }],
    },
  });

  const call = response.functionCalls?.find((c) => c.name === RETURN_FACTS_FUNCTION_NAME);

  if (!call?.args) {
    throw new Error("Model did not return structured location facts");
  }

  return call.args as unknown as LocationFactsResponse;
}

const RETURN_ANSWER_FUNCTION_NAME = "return_location_answer";

const returnLocationAnswerDeclaration: FunctionDeclaration = {
  name: RETURN_ANSWER_FUNCTION_NAME,
  description:
    "Return the final, verified answer to the user's question about their location. Call this exactly once, after searching, as your final action.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      answer: {
        type: "string",
        description: "A direct, conversational answer to the user's question, 2-6 sentences",
      },
      locationLabel: {
        type: "string",
        description: "The place this answer actually describes (narrow if possible, broader if that's what the search supported)",
      },
      noVerifiedAnswerFound: {
        type: "boolean",
        description: "True if search turned up nothing that verifiably answers the question",
      },
      sources: {
        type: "array",
        description: "Sources backing the answer, each grounded in an actual search result. Empty if noVerifiedAnswerFound is true.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Title of the source page" },
            url: { type: "string", description: "URL of the source, must come from an actual search result" },
          },
          required: ["title", "url"],
        },
      },
    },
    required: ["answer", "locationLabel", "noVerifiedAnswerFound", "sources"],
  },
};

function buildAskSystemPrompt(): string {
  return `You are a rigorous local guide for a live travel app called TravelTales. A user is standing at a specific GPS location right now and is asking you a free-form question about where they are.

Rules:
- Use Google Search grounding to find real, current sources before answering. Do not rely on your own memory for facts — verify everything through search.
- Answer the user's actual question directly and conversationally — don't pad with unrelated facts.
- Every claim in your answer must be traceable to a specific search result. Include the real title and URL of each source you relied on.
- Stay as hyper-local as possible to the given coordinates. Only broaden scope if nothing verifiable exists for the exact spot, and say so honestly via locationLabel.
- If you genuinely cannot find a verifiable answer, set noVerifiedAnswerFound to true, say so plainly in answer, and return an empty sources array rather than guessing.
- Never fabricate a source URL. If you are not confident a URL came from your search results, don't cite it.
- Finish by calling the ${RETURN_ANSWER_FUNCTION_NAME} function exactly once with the final structured result. Do not include any other prose in your final turn.`;
}

export async function answerLocationQuestion(req: AskRequest): Promise<AskResponse> {
  const { latitude, longitude, placeLabel, question, radiusMiles } = req;

  const userMessage = `Current GPS coordinates: ${latitude}, ${longitude}${
    placeLabel ? ` (approximate place: ${placeLabel})` : ""
  }. Search radius: stay within approximately ${radiusMiles ?? DEFAULT_RADIUS_MILES} miles of these coordinates unless the question requires broader context. Question: ${question}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userMessage,
    config: {
      systemInstruction: buildAskSystemPrompt(),
      tools: [googleSearchTool, { functionDeclarations: [returnLocationAnswerDeclaration] }],
    },
  });

  const call = response.functionCalls?.find((c) => c.name === RETURN_ANSWER_FUNCTION_NAME);

  if (!call?.args) {
    throw new Error("Model did not return a structured answer");
  }

  return { question, ...(call.args as unknown as Omit<AskResponse, "question">) };
}
