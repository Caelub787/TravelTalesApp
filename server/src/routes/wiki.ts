import { Router } from "express";
import { fetchWikiLocationFacts, searchWikiAnswer } from "../services/wikipedia.js";
import type { AskRequest, CategoryId, LocationFactsRequest } from "../types.js";

const VALID_CATEGORIES: CategoryId[] = ["history", "culture", "nature", "architecture", "legends", "people", "general"];

export const wikiRouter = Router();

wikiRouter.post("/wiki-facts", async (req, res) => {
  const { latitude, longitude, placeLabel, category } = req.body ?? {};

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
  };

  try {
    const result = await fetchWikiLocationFacts(request);
    res.json(result);
  } catch (err) {
    console.error("Failed to fetch Wikipedia facts:", err);
    res.status(502).json({ error: "Failed to fetch facts from Wikipedia" });
  }
});

wikiRouter.post("/wiki-search", async (req, res) => {
  const { latitude, longitude, placeLabel, question } = req.body ?? {};

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    res.status(400).json({ error: "latitude and longitude must be numbers" });
    return;
  }
  if (typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({ error: "question must be a non-empty string" });
    return;
  }

  const request: AskRequest = {
    latitude,
    longitude,
    placeLabel: typeof placeLabel === "string" ? placeLabel : undefined,
    question: question.trim(),
  };

  try {
    const result = await searchWikiAnswer(request);
    res.json(result);
  } catch (err) {
    console.error("Failed to search Wikipedia:", err);
    res.status(502).json({ error: "Failed to search Wikipedia" });
  }
});
