import type { Scenario } from '@jornada/shared';
import { spRioScenario } from '@jornada/shared';

import { useJourneyStore } from '@/state/store';

export interface AutoplayOptions {
  scenario?: Scenario;
  /** Playback speed multiplier (2 = twice as fast). */
  speed?: number;
}

let timers: ReturnType<typeof setTimeout>[] = [];
let running = false;

/**
 * Plays the embedded scenario against the same applyEvent used by the WS
 * client, so every screen behaves exactly as in the server-driven demo.
 */
export function startAutoplay(options: AutoplayOptions = {}): void {
  const scenario = options.scenario ?? spRioScenario;
  const speed = options.speed && options.speed > 0 ? options.speed : 1;

  stopAutoplay();
  running = true;
  useJourneyStore.getState().setConnection('autoplay');

  timers = scenario.steps.map((step) =>
    setTimeout(() => {
      useJourneyStore.getState().applyEvent(step.event);
    }, step.afterMs / speed),
  );
}

export function stopAutoplay(): void {
  timers.forEach(clearTimeout);
  timers = [];
  running = false;
}

/** Stops playback and returns the store to its initial state. */
export function resetAutoplay(): void {
  stopAutoplay();
  useJourneyStore.getState().reset();
}

export function isAutoplayRunning(): boolean {
  return running;
}
