import type { Coords } from '@/hooks/use-live-location';

// OSRM's public demo server — free, keyless, returns the actual road-following path
// between waypoints (not straight lines). It's meant for light/personal use, which fits
// this app; if it ever needs to change, this is the only place that would need to.
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export interface RouteResult {
  geometry: Coords[];
  distanceMeters: number;
  durationSeconds: number;
}

interface OsrmResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }[];
}

export async function fetchRoute(waypoints: Coords[]): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error('At least two waypoints are required to compute a route');
  }

  const coordsParam = waypoints.map((point) => `${point.longitude},${point.latitude}`).join(';');
  const url = `${OSRM_BASE}/${coordsParam}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Routing request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OsrmResponse;
  const route = data.routes?.[0];
  if (!route) {
    throw new Error('No route found between those points');
  }

  const geometry: Coords[] = route.geometry.coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));

  return { geometry, distanceMeters: route.distance, durationSeconds: route.duration };
}
