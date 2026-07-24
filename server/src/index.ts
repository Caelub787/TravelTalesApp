import "dotenv/config";
import express from "express";
import cors from "cors";
import { locationFactsRouter } from "./routes/locationFacts.js";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("Warning: ANTHROPIC_API_KEY is not set. /api/location-facts will fail until it is.");
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", locationFactsRouter);

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`TravelTales server listening on port ${port}`);
});
