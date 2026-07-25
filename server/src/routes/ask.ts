import { Router } from "express";
import { answerLocationQuestion } from "../services/geminiClient.js";
import type { AskRequest } from "../types.js";

export const askRouter = Router();

askRouter.post("/ask", async (req, res) => {
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
    const result = await answerLocationQuestion(request);
    res.json(result);
  } catch (err) {
    console.error("Failed to answer location question:", err);
    res.status(502).json({ error: "Failed to get an answer from Gemini" });
  }
});
