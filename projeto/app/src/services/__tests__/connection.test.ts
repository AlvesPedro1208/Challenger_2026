import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { DemoEvent } from '@jornada/shared';

import { useJourneyStore } from '@/state/store';

import { connectToDemoServer, parseDemoEvent } from '../connection';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports */
// The module under test resolves its URL through serverConfig, which reads the
// saved override from AsyncStorage; its native module is null under Jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

const URL = 'ws://localhost:4000/ws';

/** Minimal stand-in for the RN WebSocket, driven by the test. */
class FakeSocket {
  static instances: FakeSocket[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((message: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  closedByClient = false;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  close(): void {
    this.closedByClient = true;
  }

  static get last(): FakeSocket {
    const socket = FakeSocket.instances[FakeSocket.instances.length - 1];
    if (!socket) throw new Error('no socket was created');
    return socket;
  }
}

const originalWebSocket = globalThis.WebSocket;
const originalApplyEvent = useJourneyStore.getState().applyEvent;
const applyEvent = jest.fn<(event: DemoEvent) => void>();

const telemetry = JSON.stringify({
  type: 'BUS_TELEMETRY',
  at: '2026-09-13T22:40:00-03:00',
  lat: -23.4778,
  lng: -46.5729,
  speedKmh: 52,
  heading: 57,
  etaNextStopMin: 176,
  etaDestinationIso: '2026-09-14T06:10:00-03:00',
});

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
  applyEvent.mockClear();
  (globalThis as { WebSocket: unknown }).WebSocket = FakeSocket;
  useJourneyStore.setState({ applyEvent });
});

afterEach(() => {
  jest.useRealTimers();
  (globalThis as { WebSocket: unknown }).WebSocket = originalWebSocket;
  useJourneyStore.setState({ applyEvent: originalApplyEvent });
  useJourneyStore.getState().reset();
});

/** Burns the short backoff budget so the connection gives up. */
function exhaustAttempts(maxAttempts: number): void {
  for (let i = 0; i < maxAttempts; i += 1) {
    FakeSocket.last.onclose?.();
    // Let the short backoff open the next socket, but never run past the
    // give-up so the background interval is still pending.
    if (i < maxAttempts - 1) jest.advanceTimersByTime(10_000);
  }
}

describe('parseDemoEvent', () => {
  it('accepts a well-formed event frame', () => {
    expect(parseDemoEvent(telemetry)).toMatchObject({ type: 'BUS_TELEMETRY' });
  });

  it('drops malformed and unknown frames', () => {
    expect(parseDemoEvent('{')).toBeNull();
    expect(parseDemoEvent(JSON.stringify({ type: 'NOPE', at: 'x' }))).toBeNull();
    expect(parseDemoEvent(JSON.stringify({ type: 'ARRIVAL' }))).toBeNull();
  });
});

describe('connectToDemoServer', () => {
  it('feeds panel events into the store while connected', () => {
    const disconnect = connectToDemoServer({ url: URL });
    FakeSocket.last.onopen?.();
    FakeSocket.last.onmessage?.({ data: telemetry });

    expect(useJourneyStore.getState().connection).toBe('panel');
    expect(applyEvent).toHaveBeenCalledTimes(1);
    disconnect();
  });

  it('gives up once after the short retry budget', () => {
    const onGiveUp = jest.fn();
    const disconnect = connectToDemoServer({ url: URL, maxAttempts: 2, onGiveUp });

    exhaustAttempts(2);

    expect(onGiveUp).toHaveBeenCalledTimes(1);
    expect(useJourneyStore.getState().connection).toBe('offline');
    disconnect();
  });

  it('keeps retrying in the background after giving up', () => {
    const disconnect = connectToDemoServer({
      url: URL,
      maxAttempts: 1,
      retryIntervalMs: 15_000,
    });

    exhaustAttempts(1);
    const afterGiveUp = FakeSocket.instances.length;

    jest.advanceTimersByTime(14_000);
    expect(FakeSocket.instances).toHaveLength(afterGiveUp);

    jest.advanceTimersByTime(1_000);
    expect(FakeSocket.instances).toHaveLength(afterGiveUp + 1);

    // Unlimited: another failed attempt schedules yet another retry.
    FakeSocket.last.onclose?.();
    jest.advanceTimersByTime(15_000);
    expect(FakeSocket.instances).toHaveLength(afterGiveUp + 2);
    disconnect();
  });

  it('hands the demo back to the panel when a background retry connects', () => {
    const onGiveUp = jest.fn();
    const onReconnected = jest.fn();
    const disconnect = connectToDemoServer({
      url: URL,
      maxAttempts: 1,
      retryIntervalMs: 15_000,
      onGiveUp,
      onReconnected,
    });

    exhaustAttempts(1);
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    expect(onReconnected).not.toHaveBeenCalled();

    jest.advanceTimersByTime(15_000);
    FakeSocket.last.onopen?.();

    expect(onReconnected).toHaveBeenCalledTimes(1);
    expect(useJourneyStore.getState().connection).toBe('panel');

    FakeSocket.last.onmessage?.({ data: telemetry });
    expect(applyEvent).toHaveBeenCalledTimes(1);
    disconnect();
  });

  it('never calls onGiveUp again once auto-play has taken over', () => {
    const onGiveUp = jest.fn();
    const disconnect = connectToDemoServer({
      url: URL,
      maxAttempts: 1,
      retryIntervalMs: 15_000,
      onGiveUp,
    });

    exhaustAttempts(1);
    jest.advanceTimersByTime(15_000);
    FakeSocket.last.onopen?.();
    FakeSocket.last.onclose?.();
    jest.advanceTimersByTime(60_000);

    expect(onGiveUp).toHaveBeenCalledTimes(1);
    disconnect();
  });

  it('ignores late frames from a socket that was already replaced', () => {
    const disconnect = connectToDemoServer({ url: URL, maxAttempts: 3 });
    const stale = FakeSocket.last;

    stale.onclose?.();
    jest.advanceTimersByTime(10_000);
    expect(FakeSocket.instances.length).toBeGreaterThan(1);

    stale.onmessage?.({ data: telemetry });
    expect(applyEvent).not.toHaveBeenCalled();

    // A late close from the stale socket must not schedule another socket.
    const before = FakeSocket.instances.length;
    stale.onclose?.();
    jest.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(before);
    disconnect();
  });

  it('leaves no timer or socket behind on disconnect', () => {
    const onGiveUp = jest.fn();
    const disconnect = connectToDemoServer({
      url: URL,
      maxAttempts: 1,
      retryIntervalMs: 15_000,
      onGiveUp,
    });

    exhaustAttempts(1);
    const created = FakeSocket.instances.length;
    disconnect();

    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(120_000);
    expect(FakeSocket.instances).toHaveLength(created);
  });

  it('stops feeding the store after disconnect', () => {
    const disconnect = connectToDemoServer({ url: URL });
    const socket = FakeSocket.last;
    socket.onopen?.();
    disconnect();

    expect(socket.closedByClient).toBe(true);
    socket.onmessage?.({ data: telemetry });
    expect(applyEvent).not.toHaveBeenCalled();
  });
});
