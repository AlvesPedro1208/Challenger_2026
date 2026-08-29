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
let pendingSteps = 0;

/**
 * Plays the embedded scenario against the same applyEvent used by the WS
 * client, so every screen behaves exactly as in the server-driven demo.
 */
export function startAutoplay(options: AutoplayOptions = {}): void {
  const scenario = options.scenario ?? spRioScenario;
  const speed = options.speed && options.speed > 0 ? options.speed : 1;

  stopAutoplay();
  running = true;
  pendingSteps = scenario.steps.length;
  useJourneyStore.getState().setConnection('autoplay');

  timers = scenario.steps.map((step) =>
    setTimeout(() => {
      useJourneyStore.getState().applyEvent(step.event);
      pendingSteps -= 1;
      if (pendingSteps <= 0) {
        running = false;
      }
    }, step.afterMs / speed),
  );

  if (pendingSteps === 0) {
    running = false;
  }
}

export function stopAutoplay(): void {
  timers.forEach(clearTimeout);
  timers = [];
  pendingSteps = 0;
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
