import { Router } from "express";
import { fetchLocationFacts } from "../services/geminiClient.js";
import type { CategoryId, LocationFactsRequest } from "../types.js";

const VALID_CATEGORIES: CategoryId[] = ["history", "culture", "nature", "architecture", "legends", "people", "general"];

export const locationFactsRouter = Router();

function parseRadiusMiles(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

locationFactsRouter.post("/location-facts", async (req, res) => {
  const { latitude, longitude, placeLabel, category, radiusMiles } = req.body ?? {};

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    res.status(400).json({ error: "latitude and longitude must be numbers" });
    return;
  }
  if (!VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` });
    return;
  }

  const request: LocationFactsRequest = {
    latitude,
    longitude,
    placeLabel: typeof placeLabel === "string" ? placeLabel : undefined,
    category,
    radiusMiles: parseRadiusMiles(radiusMiles),
  };

  try {
    const result = await fetchLocationFacts(request);
    res.json(result);
  } catch (err) {
    console.error("Failed to fetch location facts:", err);
    res.status(502).json({ error: "Failed to fetch location facts from Gemini" });
  }
});
