import { Router } from "express";
import { fetchNearbyPlaces } from "../services/places.js";
import type { NearbyPlacesRequest } from "../types.js";
import { errorMessage } from "../utils/errorMessage.js";

export const placesRouter = Router();

function parseRadiusMiles(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

placesRouter.post("/places-nearby", async (req, res) => {
  const { latitude, longitude, radiusMiles } = req.body ?? {};

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    res.status(400).json({ error: "latitude and longitude must be numbers" });
    return;
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    res.status(200).json({ places: [] });
    return;
  }

  const request: NearbyPlacesRequest = {
    latitude,
    longitude,
    radiusMiles: parseRadiusMiles(radiusMiles),
  };

  try {
    const result = await fetchNearbyPlaces(request);
    res.json(result);
  } catch (err) {
    console.error("Failed to fetch nearby places:", err);
    res.status(502).json({ error: errorMessage(err, "Failed to fetch nearby destinations") });
  }
});
