import type { DemoEvent, DemoEventType } from "@jornada/shared";

/**
 * Journey state snapshot: the last event applied for each event type, kept in
 * last-applied order. Clients that connect mid-demo replay this snapshot to
 * catch up with the current state of the journey.
 */
export class JourneyState {
  private readonly events = new Map<DemoEventType, DemoEvent>();

  apply(event: DemoEvent): void {
    // Delete first so re-applied types move to the end of the replay order.
    this.events.delete(event.type);
    this.events.set(event.type, event);
  }

  snapshot(): DemoEvent[] {
    return [...this.events.values()];
  }

  reset(): void {
    this.events.clear();
  }
}
