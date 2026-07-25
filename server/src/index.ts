import "dotenv/config";
import express from "express";
import cors from "cors";
import { locationFactsRouter } from "./routes/locationFacts.js";
import { askRouter } from "./routes/ask.js";
import { wikiRouter } from "./routes/wiki.js";

if (!process.env.GEMINI_API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set. Story Mode (/api/location-facts, /api/ask) will fail until it is.");
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", locationFactsRouter);
app.use("/api", askRouter);
app.use("/api", wikiRouter);

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`TravelTales server listening on port ${port}`);
});
