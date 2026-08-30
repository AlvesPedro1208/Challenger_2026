import * as Notifications from 'expo-notifications';

import type { JourneySnapshot } from '@/state/store';
import { useJourneyStore } from '@/state/store';

export interface JourneyNotification {
  /** Stable identity of the underlying event, used to suppress duplicates. */
  key: string;
  title: string;
  body: string;
}

/** "Rio de Janeiro (Terminal Novo Rio)" -> "Rio de Janeiro". */
function cityOf(destination: string): string {
  const [city] = destination.split(' (');
  return (city ?? destination).trim();
}

/**
 * Turns a store transition into the local notifications the demo should raise.
 * Pure, so the pt-BR copy and the de-duplication keys are testable without the
 * native module.
 */
export function diffNotifications(
  prev: JourneySnapshot,
  next: JourneySnapshot,
): JourneyNotification[] {
  const notifications: JourneyNotification[] = [];

  const change = next.platform.pendingChange;
  const previousChange = prev.platform.pendingChange;
  if (change && (change.from !== previousChange?.from || change.to !== previousChange?.to)) {
    notifications.push({
      key: `platform:${change.from}>${change.to}`,
      title: 'Plataforma alterada',
      body:
        change.walkMinutes > 0
          ? `${change.from} → ${change.to} · ${change.walkMinutes} min de caminhada`
          : `${change.from} → ${change.to}`,
    });
  }

  const approaching = next.approachingStop;
  if (approaching && approaching.stopId !== prev.approachingStop?.stopId) {
    const stop = next.stops.find((item) => item.id === approaching.stopId);
    notifications.push({
      key: `stop:${approaching.stopId}`,
      title: 'Próxima parada',
      body: stop
        ? `${stop.name} em ${approaching.inMinutes} min`
        : `Próxima parada em ${approaching.inMinutes} min`,
    });
  }

  const risk = next.risk;
  if (risk && risk.riskPct !== prev.risk?.riskPct) {
    notifications.push({
      key: `risk:${risk.riskPct}`,
      title: 'Risco de perder o embarque',
      body: risk.canRebook
        ? `${risk.riskPct}% de risco · remarcação disponível por R$ ${risk.rebookFeeBRL}`
        : `${risk.riskPct}% de risco de perder o embarque`,
    });
  }

  if (next.arrived && !prev.arrived) {
    const destination = next.trip?.destination;
    notifications.push({
      key: 'arrival',
      title: 'Boas-vindas ao destino',
      body: destination
        ? `Chegada em ${cityOf(destination)} · veja recomendações para agora`
        : 'Você chegou ao destino · veja recomendações para agora',
    });
  }

  return notifications;
}

const deliveredKeys = new Set<string>();

/**
 * Asks for notification permission and configures foreground presentation.
 * Never throws: a denied prompt or a missing module must not break the demo.
 */
export async function initNotifications(): Promise<boolean> {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function presentNotification(notification: JourneyNotification): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: notification.title, body: notification.body },
      trigger: null,
    });
  } catch {
    // Permission denied or unsupported host: the on-screen UI already carries
    // the same information, so the demo keeps running.
  }
}

/**
 * Raises a local notification for every key event reaching the store, whether
 * it came from the control panel or from auto-play. Returns an unsubscribe.
 */
export function startNotificationBridge(): () => void {
  return useJourneyStore.subscribe((state, prev) => {
    for (const notification of diffNotifications(prev, state)) {
      if (deliveredKeys.has(notification.key)) continue;
      deliveredKeys.add(notification.key);
      void presentNotification(notification);
    }
  });
}

/** Clears the de-duplication memory so a demo can be replayed from the start. */
export function resetNotificationHistory(): void {
  deliveredKeys.clear();
}
