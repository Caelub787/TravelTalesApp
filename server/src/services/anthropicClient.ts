import Anthropic from "@anthropic-ai/sdk";
import type { CategoryId, LocationFactsRequest, LocationFactsResponse } from "../types.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

const CATEGORY_GUIDANCE: Record<CategoryId, string> = {
  history: "significant historical events, founding dates, wars, or turning points tied to this exact spot",
  culture: "local traditions, festivals, customs, language quirks, or cultural practices tied to this area",
  nature: "geology, native wildlife, plant life, climate, or notable natural features nearby",
  architecture: "notable buildings, architectural styles, landmarks, or design history nearby",
  legends: "folklore, myths, ghost stories, or local legends associated with this area (clearly labeled as legend, not verified fact, but the existence and origin of the legend itself should be sourced)",
  people: "notable people who were born, lived, worked, or are otherwise historically tied to this specific area",
};

const RETURN_TOOL_NAME = "return_location_facts";

const returnLocationFactsTool: Anthropic.Tool = {
  name: RETURN_TOOL_NAME,
  description:
    "Return the final, verified location facts/story payload to show the user. Call this exactly once, after searching, as your final action.",
  input_schema: {
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
        description: "True if web search turned up no verifiable facts for this location/category, even at a broader radius",
      },
      facts: {
        type: "array",
        description: "Individual facts, each grounded in a real source found via web search. Empty if noVerifiedFactsFound is true.",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "A single, specific, verifiable fact or story beat" },
            source: {
              type: "object",
              properties: {
                title: { type: "string", description: "Title of the source page" },
                url: { type: "string", description: "URL of the source, must come from an actual web_search result" },
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
- Use the web_search tool to find real, current sources before writing anything. Do not rely on your own memory for facts — verify everything through search.
- Every fact you report must be traceable to a specific search result. Include the real title and URL of that result as the source.
- Stay as hyper-local as possible to the given coordinates. Only broaden to the surrounding neighborhood, city, or region if nothing verifiable exists for the exact spot — and if you do, say so honestly via locationLabel and keep facts relevant to that broader area.
- If you genuinely cannot find any verifiable facts even at a broader radius, set noVerifiedFactsFound to true and return an empty facts array rather than inventing content.
- Never fabricate a source URL. If you are not confident a URL came from your search results, leave that fact out.
- Finish by calling the ${RETURN_TOOL_NAME} tool exactly once with the final structured result. Do not include any other prose in your final turn.`;
}

export async function fetchLocationFacts(req: LocationFactsRequest): Promise<LocationFactsResponse> {
  const { latitude, longitude, placeLabel, category } = req;

  const userMessage = `Current GPS coordinates: ${latitude}, ${longitude}${
    placeLabel ? ` (approximate place: ${placeLabel})` : ""
  }. Category requested: ${category}.`;

  const webSearchTool: Anthropic.WebSearchTool20250305 = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 5,
  };

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: buildSystemPrompt(category),
    messages: [{ role: "user", content: userMessage }],
    tools: [webSearchTool, returnLocationFactsTool],
  });

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === RETURN_TOOL_NAME
  );

  if (!toolUseBlock) {
    throw new Error("Model did not return structured location facts");
  }

  return toolUseBlock.input as LocationFactsResponse;
}
