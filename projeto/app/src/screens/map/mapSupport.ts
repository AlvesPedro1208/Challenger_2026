import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Whether the native map can draw tiles. Android builds need the Google Maps
 * key baked in by app.config.ts; Expo Go (own key) and iOS (Apple Maps) do not.
 */
export function mapAvailableFor(
  os: typeof Platform.OS,
  environment: ExecutionEnvironment,
  extra: Record<string, unknown> | undefined,
): boolean {
  if (os !== 'android') return true;
  if (environment === ExecutionEnvironment.StoreClient) return true;
  return extra?.googleMapsAndroidKeyConfigured === true;
}

export function nativeMapAvailable(): boolean {
  // Força o carregamento do mapa nativo agora que a API do Google Maps está ativada
  return true;
}