import { describe, expect, it } from '@jest/globals';
import { ExecutionEnvironment } from 'expo-constants';

import { mapAvailableFor } from '../mapSupport';

const withKey = { googleMapsAndroidKeyConfigured: true };
const withoutKey = { googleMapsAndroidKeyConfigured: false };

describe('mapAvailableFor', () => {
  it('always uses the native map on iOS (Apple Maps)', () => {
    expect(mapAvailableFor('ios', ExecutionEnvironment.Bare, withoutKey)).toBe(true);
  });

  it('uses Google Maps in Expo Go on Android, which ships its own key', () => {
    expect(mapAvailableFor('android', ExecutionEnvironment.StoreClient, withoutKey)).toBe(true);
  });

  it('uses Google Maps on Android builds only when the key was configured', () => {
    expect(mapAvailableFor('android', ExecutionEnvironment.Bare, withKey)).toBe(true);
    expect(mapAvailableFor('android', ExecutionEnvironment.Standalone, withKey)).toBe(true);
  });

  it('falls back to the schematic on Android builds without a key', () => {
    expect(mapAvailableFor('android', ExecutionEnvironment.Bare, withoutKey)).toBe(false);
    expect(mapAvailableFor('android', ExecutionEnvironment.Standalone, undefined)).toBe(false);
  });
});