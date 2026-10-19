import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ErrorBoundary, Stack } from 'expo-router';
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

// Exporta o ErrorBoundary para que o Expo Router consiga tratar erros de tela
export { ErrorBoundary };

/** Detecta se o app está rodando dentro do Expo Go */
const isExpoGo = Constants?.executionEnvironment === ExecutionEnvironment.StoreClient;

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

    // Inicia persistência de cache
    const cleanups: (() => void)[] = [startJourneyCachePersistence()];

    // Notificações remotas não são suportadas no Expo Go no Android (SDK 53+)
    if (!isExpoGo) {
      try {
        const cleanupBridge = startNotificationBridge();
        if (typeof cleanupBridge === 'function') {
          cleanups.push(cleanupBridge);
        }
      } catch (err) {
        console.warn('[Notifications] Bridge desabilitada no Expo Go:', err);
      }
    }

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
            if (!cancelled) resumeAutoplay();
          },
          onReconnected: () => {
            if (!cancelled) stopAutoplay();
          },
        }),
      );

      // Protege a inicialização de notificações de quebrar o app
      if (!isExpoGo) {
        try {
          await initNotifications();
        } catch (err) {
          console.warn('[Notifications] Init desabilitado no Expo Go:', err);
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
      stopAutoplay();
      cleanups.forEach((cleanup) => {
        try {
          cleanup();
        } catch {
          // Garante que falhas de cleanup não travem o desmonte
        }
      });
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