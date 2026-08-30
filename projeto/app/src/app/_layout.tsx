import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DataSourceIndicator, useJourneyPhaseNavigation } from '@/navigation';
import { startAutoplay, stopAutoplay } from '@/services/autoplay';
import { runBootstrap } from '@/services/bootstrap';
import { connectToDemoServer } from '@/services/connection';
import { initNotifications, startNotificationBridge } from '@/services/notifications';
import { hydrateFromCache, startJourneyCachePersistence } from '@/state/persistence';
import { colors } from '@/theme/tokens';

/** Short retry budget so auto-play takes over within seconds if the Wi-Fi is down. */
const WS_MAX_ATTEMPTS = 3;

/**
 * Boots the demo: offline cache first (so the ticket is there instantly),
 * then bootstrap data, then the live panel connection. If the socket gives
 * up, the embedded scenario plays the same events.
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
          onGiveUp: () => {
            if (!cancelled) startAutoplay();
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
