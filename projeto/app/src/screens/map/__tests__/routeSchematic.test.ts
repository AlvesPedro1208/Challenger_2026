import { describe, expect, it } from '@jest/globals';

import { ROUTE_POINTS } from '@jornada/shared';

import { projectRoute } from '../routeSchematic';

describe('projectRoute', () => {
  const width = 360;
  const height = 640;
  const padding = 40;
  const { project } = projectRoute(ROUTE_POINTS, width, height, padding);

  it('keeps every route point inside the padded box', () => {
    for (const point of ROUTE_POINTS) {
      const { x, y } = project(point);
      expect(x).toBeGreaterThanOrEqual(padding - 1e-6);
      expect(x).toBeLessThanOrEqual(width - padding + 1e-6);
      expect(y).toBeGreaterThanOrEqual(padding - 1e-6);
      expect(y).toBeLessThanOrEqual(height - padding + 1e-6);
    }
  });

  it('puts north up and east right (Rio is east and north of Sao Paulo)', () => {
    const origin = project(ROUTE_POINTS[0]!);
    const destination = project(ROUTE_POINTS[ROUTE_POINTS.length - 1]!);
    expect(destination.x).toBeGreaterThan(origin.x);
    expect(destination.y).toBeLessThan(origin.y);
  });

  it('does not divide by zero on a single-point route', () => {
    const single = projectRoute([{ lat: -22.9, lng: -43.2 }], 100, 100, 10);
    const { x, y } = single.project({ lat: -22.9, lng: -43.2 });
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
  });
});