/**
 * Simulated demo clock. Simulated time advances from a settable base at a
 * configurable multiple of wall time and can be paused/resumed.
 *
 * SET_CLOCK (and scripted CLOCK_SET events) use `isoTime` as the source of
 * truth for the new base; the event's `at` field is only a send stamp and is
 * never applied to the clock.
 */
export class SimClock {
  private baseSimMs: number;
  private anchorWallMs: number;
  private multiplier = 1;
  private paused = false;

  constructor(private readonly wallNow: () => number = () => Date.now()) {
    this.baseSimMs = this.wallNow();
    this.anchorWallMs = this.baseSimMs;
  }

  /** Accumulate elapsed simulated time into the base and re-anchor. */
  private fold(): void {
    const wall = this.wallNow();
    if (!this.paused) {
      this.baseSimMs += (wall - this.anchorWallMs) * this.multiplier;
    }
    this.anchorWallMs = wall;
  }

  setBase(isoTime: string): void {
    const parsed = Date.parse(isoTime);
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid iso time: ${isoTime}`);
    }
    this.baseSimMs = parsed;
    this.anchorWallMs = this.wallNow();
  }

  setSpeed(multiplier: number): void {
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      throw new Error(`Invalid speed multiplier: ${multiplier}`);
    }
    this.fold();
    this.multiplier = multiplier;
  }

  pause(): void {
    this.fold();
    this.paused = true;
  }

  resume(): void {
    this.anchorWallMs = this.wallNow();
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getSpeed(): number {
    return this.multiplier;
  }

  /** Current simulated time as epoch milliseconds. */
  now(): number {
    if (this.paused) return this.baseSimMs;
    return this.baseSimMs + (this.wallNow() - this.anchorWallMs) * this.multiplier;
  }

  nowIso(): string {
    return new Date(this.now()).toISOString();
  }
}
