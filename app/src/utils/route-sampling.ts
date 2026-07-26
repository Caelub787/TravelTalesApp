import type { Coords } from '@/hooks/use-live-location';
import { distanceMeters } from '@/utils/distance';

export interface RouteSample extends Coords {
  distanceAlongRouteMeters: number;
}

// Walks the full road-following route geometry (not just the pins the user dropped) and
// picks a point every `intervalMeters`, so downloaded content covers everything in
// between, not just the endpoints.
export function sampleRoute(geometry: Coords[], intervalMeters: number): RouteSample[] {
  if (geometry.length === 0) return [];

  const samples: RouteSample[] = [{ ...geometry[0], distanceAlongRouteMeters: 0 }];
  let distanceSinceLastSample = 0;
  let cumulativeDistance = 0;

  for (let i = 1; i < geometry.length; i++) {
    const segment = distanceMeters(geometry[i - 1], geometry[i]);
    cumulativeDistance += segment;
    distanceSinceLastSample += segment;
    if (distanceSinceLastSample >= intervalMeters) {
      samples.push({ ...geometry[i], distanceAlongRouteMeters: cumulativeDistance });
      distanceSinceLastSample = 0;
    }
  }

  const last = geometry[geometry.length - 1];
  const lastSample = samples[samples.length - 1];
  if (distanceMeters(lastSample, last) > 50) {
    samples.push({ ...last, distanceAlongRouteMeters: cumulativeDistance });
  }

  return samples;
}
