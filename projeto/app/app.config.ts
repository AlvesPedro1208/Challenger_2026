import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Google Maps on Android needs an API key ("Maps SDK for Android"); without it
 * the map renders black with only the Google logo. The key comes from the
 * environment (app/.env, never committed). Expo Go ships its own key; iOS uses
 * Apple Maps and needs none.
 */
const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim() ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Jornada Viva',
  slug: config.slug ?? 'jornada-viva',
  android: {
    ...config.android,
    package: config.android?.package ?? 'br.com.jornadaviva.app',
  },
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', androidMapsKey ? { androidGoogleMapsApiKey: androidMapsKey } : {}],
  ],
  extra: {
    ...config.extra,
    googleMapsAndroidKeyConfigured: androidMapsKey.length > 0,
  },
});