import { ROUTE_POINTS, haversineKm, type RoutePoint, type Stop } from '@jornada/shared';

/** Index of the route polyline point closest to `point`. */
function routeIndexOf(point: RoutePoint): number {
  let bestIndex = 0;
  let bestKm = Number.POSITIVE_INFINITY;

  ROUTE_POINTS.forEach((candidate, index) => {
    const km = haversineKm(candidate, point);
    if (km < bestKm) {
      bestKm = km;
      bestIndex = index;
    }
  });

  return bestIndex;
}

/**
 * Stops the bus has not driven past yet, in the order they were given. A stop
 * the bus is currently sitting at still counts as remaining, so the ETA to it
 * stays labeled as a stop ETA while the bus is there.
 */
export function remainingStops(stops: readonly Stop[], position: RoutePoint | null): Stop[] {
  if (!position) {
    return [...stops];
  }

  const busIndex = routeIndexOf(position);
  return stops.filter((stop) => routeIndexOf(stop) >= busIndex);
}
