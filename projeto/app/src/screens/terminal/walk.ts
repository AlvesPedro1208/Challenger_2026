import type { IndoorMap } from '@jornada/shared';

import { formatDuration } from './format';
import {
  indoorGraphFor,
  routeBetweenPlatforms,
  routeToPlatform,
  type IndoorRoute,
} from './indoorRoute';

/** Structural shape of the store's `platform.pendingChange`. */
export interface PlatformChangeInput {
  from: string;
  to: string;
  walkMinutes: number;
}

export interface WalkGuidance {
  /** Dashed polyline for the map; null when the corridor graph is unavailable. */
  route: IndoorRoute | null;
  /** THE walk duration of this screen - every text below is derived from it. */
  minutes: number;
  /** Formatted duration ("4 min") shown in the banner and in the card. */
  label: string;
  /** Card caption describing which walk `minutes` measures. */
  caption: string;
  /** Alert banner text; null when there is no pending platform change. */
  bannerMessage: string | null;
}

/**
 * Single source of truth for "how long is the walk to boarding".
 *
 * A PLATFORM_CHANGE event carries the walk time announced to the passenger
 * (scenario and demo panel), so it wins whenever there is a pending change;
 * the corridor graph is only the fallback estimate for the plain
 * entrance -> platform walk. Both the banner and the card read `minutes` /
 * `label` from this one object, so the screen can never show two different
 * durations for the same walk.
 */
export function resolveWalkGuidance(
  map: IndoorMap | null,
  currentPlatform: string | null,
  pendingChange: PlatformChangeInput | null,
): WalkGuidance | null {
  if (!currentPlatform) {
    return null;
  }

  const graph = map ? indoorGraphFor(map) : null;
  const change = pendingChange && pendingChange.to === currentPlatform ? pendingChange : null;

  if (change) {
    const route = graph ? routeBetweenPlatforms(graph, change.from, change.to) : null;
    const minutes = change.walkMinutes;
    const label = formatDuration(minutes);
    return {
      route,
      minutes,
      label,
      caption: `Da plataforma ${change.from} até a plataforma ${change.to}`,
      bannerMessage: `Plataforma alterada: ${change.from} → ${change.to} · ${label} de caminhada`,
    };
  }

  const route = graph ? routeToPlatform(graph, currentPlatform) : null;
  if (!route) {
    return null;
  }

  return {
    route,
    minutes: route.walkMinutes,
    label: formatDuration(route.walkMinutes),
    caption: `Da entrada principal até a plataforma ${currentPlatform}`,
    bannerMessage: null,
  };
}
