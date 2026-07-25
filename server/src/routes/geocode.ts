import { Router } from "express";
import { reverseGeocode } from "../services/geocode.js";
import type { ReverseGeocodeRequest } from "../types.js";

export const geocodeRouter = Router();

geocodeRouter.get("/reverse-geocode", async (req, res) => {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    res.status(400).json({ error: "latitude and longitude query params must be numbers" });
    return;
  }

  const request: ReverseGeocodeRequest = { latitude, longitude };

  try {
    const result = await reverseGeocode(request);
    res.json(result);
  } catch (err) {
    console.error("Failed to reverse geocode:", err);
    res.status(502).json({ error: "Failed to reverse geocode" });
  }
});
