import { Router } from "express";
import { answerArticleQuestion } from "../services/groqClient.js";
import { fetchArticleContent } from "../services/wikipedia.js";
import { describeAiError, errorMessage } from "../utils/errorMessage.js";

export const articleRouter = Router();

articleRouter.post("/article-content", async (req, res) => {
  const { title } = req.body ?? {};

  if (typeof title !== "string" || title.trim().length === 0) {
    res.status(400).json({ error: "title must be a non-empty string" });
    return;
  }

  try {
    const result = await fetchArticleContent(title.trim());
    res.json(result);
  } catch (err) {
    console.error("Failed to fetch article content:", err);
    res.status(502).json({ error: errorMessage(err, "Failed to fetch article content from Wikipedia") });
  }
});

articleRouter.post("/article-ask", async (req, res) => {
  const { articleTitle, articleText, question } = req.body ?? {};

  if (
    typeof articleTitle !== "string" ||
    typeof articleText !== "string" ||
    typeof question !== "string" ||
    question.trim().length === 0
  ) {
    res.status(400).json({ error: "articleTitle, articleText, and question are required" });
    return;
  }

  try {
    const { answer, noAnswerFound } = await answerArticleQuestion({ articleTitle, articleText, question: question.trim() });
    res.json({ question: question.trim(), answer, noAnswerFound });
  } catch (err) {
    console.error("Failed to answer article question:", err);
    res.status(502).json({ error: describeAiError(err, "Failed to get an AI answer") });
  }
});
