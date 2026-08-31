import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DataSourceIndicator, useJourneyPhaseNavigation } from '@/navigation';
import { resumeAutoplay, stopAutoplay } from '@/services/autoplay';
import { runBootstrap } from '@/services/bootstrap';
import { connectToDemoServer } from '@/services/connection';
import { initNotifications, startNotificationBridge } from '@/services/notifications';
import { hydrateFromCache, startJourneyCachePersistence } from '@/state/persistence';
import { colors } from '@/theme/tokens';

/** Short retry budget so auto-play takes over within seconds if the Wi-Fi is down. */
const WS_MAX_ATTEMPTS = 3;

/** Background retry interval, so a server started late still takes over. */
const WS_BACKGROUND_RETRY_MS = 15000;

/**
 * Boots the demo: offline cache first (so the ticket is there instantly),
 * then bootstrap data, then the live panel connection. If the socket gives
 * up, the embedded scenario plays the same events; if the server shows up
 * later, auto-play stops and the panel takes the demo back.
 */
function useDemoBoot(): boolean {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cleanups: (() => void)[] = [startJourneyCachePersistence(), startNotificationBridge()];

    const boot = async (): Promise<void> => {
      try {
        await hydrateFromCache();
        if (cancelled) return;
        await runBootstrap();
      } catch {
        // Bootstrap already falls back to cache/fixture; never block the UI.
      }
      if (cancelled) return;

      setBooting(false);
      cleanups.push(
        connectToDemoServer({
          maxAttempts: WS_MAX_ATTEMPTS,
          retryIntervalMs: WS_BACKGROUND_RETRY_MS,
          onGiveUp: () => {
            // Picks the script up at the act the store is already in, so a
            // server lost mid-demo never rewinds the journey to the start.
            if (!cancelled) resumeAutoplay();
          },
          onReconnected: () => {
            // Panel events are already flowing; drop the scripted fallback so
            // the two never drive the store at once.
            if (!cancelled) stopAutoplay();
          },
        }),
      );
      void initNotifications();
    };

    void boot();

    return () => {
      cancelled = true;
      stopAutoplay();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return booting;
}

export default function RootLayout() {
  const booting = useDemoBoot();
  useJourneyPhaseNavigation();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.primary },
        }}
      />
      <DataSourceIndicator booting={booting} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
});
