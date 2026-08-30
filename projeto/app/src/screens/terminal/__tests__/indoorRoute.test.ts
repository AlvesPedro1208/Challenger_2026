import { describe, expect, it } from '@jest/globals';
import { TIETE_INDOOR_MAP, type IndoorMap } from '@jornada/shared';

import {
  WALK_UNITS_PER_MINUTE,
  indoorGraphFor,
  platformNodeId,
  routeBetweenPlatforms,
  routeToPlatform,
  type IndoorGraph,
} from '../indoorRoute';

function graphOf(map: IndoorMap = TIETE_INDOOR_MAP): IndoorGraph {
  const graph = indoorGraphFor(map);
  if (!graph) {
    throw new Error('expected the shared graph to match the shared map');
  }
  return graph;
}

describe('indoorGraphFor', () => {
  it('accepts the map the shared graph was drawn for', () => {
    expect(indoorGraphFor(TIETE_INDOOR_MAP)).not.toBeNull();
  });

  it('rejects a map whose platforms sit somewhere else', () => {
    const movedPlatforms: IndoorMap = {
      ...TIETE_INDOOR_MAP,
      platforms: TIETE_INDOOR_MAP.platforms.map((platform) => ({
        ...platform,
        x: platform.x - 200,
      })),
    };

    expect(indoorGraphFor(movedPlatforms)).toBeNull();
  });

  it('rejects a map without the main entrance the graph starts from', () => {
    const noEntrance: IndoorMap = { ...TIETE_INDOOR_MAP, gates: [] };

    expect(indoorGraphFor(noEntrance)).toBeNull();
  });
});

describe('routeToPlatform', () => {
  it('walks from the main entrance to the platform node', () => {
    const route = routeToPlatform(graphOf(), '48');

    expect(route).not.toBeNull();
    const points = route!.points;
    expect(points[0]).toEqual({ x: 60, y: 300 });
    expect(points[points.length - 1]).toEqual({ x: 930, y: 425 });
  });

  it('keeps every step of the path inside the map viewBox', () => {
    const route = routeToPlatform(graphOf(), '41');

    expect(route).not.toBeNull();
    for (const point of route!.points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1000);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(600);
    }
  });

  it('derives walkMinutes from the accumulated distance and the calibrated pace', () => {
    const route = routeToPlatform(graphOf(), '48');

    expect(route).not.toBeNull();
    expect(route!.distanceUnits).toBeGreaterThan(0);
    expect(route!.walkMinutes).toBe(
      Math.max(1, Math.ceil(route!.distanceUnits / WALK_UNITS_PER_MINUTE)),
    );
  });

  it('never estimates less than one minute', () => {
    const route = routeToPlatform(graphOf(), '45');

    expect(route).not.toBeNull();
    expect(route!.walkMinutes).toBeGreaterThanOrEqual(1);
  });

  it('returns null for a platform that is not in the graph', () => {
    expect(routeToPlatform(graphOf(), '99')).toBeNull();
  });
});

describe('routeBetweenPlatforms', () => {
  it('estimates the scripted 45 -> 48 transfer as the scenario announces (4 min)', () => {
    const route = routeBetweenPlatforms(graphOf(), '45', '48');

    expect(route).not.toBeNull();
    expect(route!.walkMinutes).toBe(4);
  });

  it('starts on the origin platform and ends on the destination platform', () => {
    const route = routeBetweenPlatforms(graphOf(), '45', '48');

    expect(route).not.toBeNull();
    const points = route!.points;
    expect(points[0]).toEqual({ x: 930, y: 275 });
    expect(points[points.length - 1]).toEqual({ x: 930, y: 425 });
  });

  it('returns null when either platform is unknown', () => {
    expect(routeBetweenPlatforms(graphOf(), '45', '99')).toBeNull();
    expect(routeBetweenPlatforms(graphOf(), '99', '48')).toBeNull();
  });
});

describe('platformNodeId', () => {
  it('matches the id the shared map uses for its platforms', () => {
    const platform = TIETE_INDOOR_MAP.platforms.find((p) => p.label === '48');

    expect(platform?.id).toBe(platformNodeId('48'));
  });
});
