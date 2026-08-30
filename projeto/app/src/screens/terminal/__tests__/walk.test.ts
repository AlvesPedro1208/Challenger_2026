import { describe, expect, it } from '@jest/globals';
import { TIETE_INDOOR_MAP, type IndoorMap } from '@jornada/shared';

import { formatDuration } from '../format';
import { resolveWalkGuidance, type PlatformChangeInput } from '../walk';

const SCRIPTED_CHANGE: PlatformChangeInput = { from: '45', to: '48', walkMinutes: 4 };

describe('resolveWalkGuidance', () => {
  it('has nothing to say without a platform', () => {
    expect(resolveWalkGuidance(TIETE_INDOOR_MAP, null, null)).toBeNull();
  });

  it('falls back to the corridor graph when no change is pending', () => {
    const walk = resolveWalkGuidance(TIETE_INDOOR_MAP, '48', null);

    expect(walk).not.toBeNull();
    expect(walk!.bannerMessage).toBeNull();
    expect(walk!.minutes).toBe(walk!.route!.walkMinutes);
    expect(walk!.caption).toBe('Da entrada principal até a plataforma 48');
  });

  it('takes the announced walk time from the event when a change is pending', () => {
    const walk = resolveWalkGuidance(TIETE_INDOOR_MAP, '48', SCRIPTED_CHANGE);

    expect(walk).not.toBeNull();
    expect(walk!.minutes).toBe(4);
    expect(walk!.caption).toBe('Da plataforma 45 até a plataforma 48');
    expect(walk!.bannerMessage).toBe('Plataforma alterada: 45 → 48 · 4 min de caminhada');
  });

  it('draws the platform-to-platform route while the change is pending', () => {
    const walk = resolveWalkGuidance(TIETE_INDOOR_MAP, '48', SCRIPTED_CHANGE);

    expect(walk!.route).not.toBeNull();
    expect(walk!.route!.points[0]).toEqual({ x: 930, y: 275 });
  });

  it('still answers with the event time when the graph cannot be trusted', () => {
    const foreignMap: IndoorMap = { ...TIETE_INDOOR_MAP, gates: [] };
    const walk = resolveWalkGuidance(foreignMap, '48', SCRIPTED_CHANGE);

    expect(walk).not.toBeNull();
    expect(walk!.route).toBeNull();
    expect(walk!.minutes).toBe(4);
  });

  it('shows no walk at all when neither event nor graph can answer', () => {
    const foreignMap: IndoorMap = { ...TIETE_INDOOR_MAP, gates: [] };

    expect(resolveWalkGuidance(foreignMap, '48', null)).toBeNull();
    expect(resolveWalkGuidance(null, '48', null)).toBeNull();
  });

  it('ignores a pending change that does not lead to the current platform', () => {
    const walk = resolveWalkGuidance(TIETE_INDOOR_MAP, '41', SCRIPTED_CHANGE);

    expect(walk!.bannerMessage).toBeNull();
    expect(walk!.caption).toBe('Da entrada principal até a plataforma 41');
  });
});

describe('single source of truth for the walk duration', () => {
  const cases: { name: string; change: PlatformChangeInput | null; platform: string }[] = [
    { name: 'pending platform change', change: SCRIPTED_CHANGE, platform: '48' },
    { name: 'no pending change', change: null, platform: '48' },
    { name: 'change already resolved elsewhere', change: null, platform: '41' },
  ];

  for (const { name, change, platform } of cases) {
    it(`banner and card never diverge - ${name}`, () => {
      const walk = resolveWalkGuidance(TIETE_INDOOR_MAP, platform, change);

      expect(walk).not.toBeNull();
      // The card prints `label`; the banner embeds that same `label`.
      expect(walk!.label).toBe(formatDuration(walk!.minutes));
      if (walk!.bannerMessage) {
        expect(walk!.bannerMessage).toContain(walk!.label);
      }
    });
  }

  it('the graph fallback agrees with the scripted event for the same walk', () => {
    const fromEvent = resolveWalkGuidance(TIETE_INDOOR_MAP, '48', SCRIPTED_CHANGE);
    const fromGraph = fromEvent!.route!.walkMinutes;

    expect(fromEvent!.minutes).toBe(fromGraph);
  });
});
