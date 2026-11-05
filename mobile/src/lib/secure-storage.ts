import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * Where login tokens are kept.
 *
 * - iOS/Android: the system keychain/keystore (encrypted, per-app) via expo-secure-store.
 * - Web: localStorage. Browsers have no keychain; the short-lived access token and
 *   rotating refresh token limit the damage if a token is ever exposed.
 */
export const secureStorage: StateStorage =
  Platform.OS === 'web'
    ? {
        getItem: (key) => {
          try {
            return globalThis.localStorage?.getItem(key) ?? null;
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            globalThis.localStorage?.setItem(key, value);
          } catch {
            // Private browsing or storage disabled: stay signed in for this visit only.
          }
        },
        removeItem: (key) => {
          try {
            globalThis.localStorage?.removeItem(key);
          } catch {
            // ignore
          }
        },
      }
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      };
