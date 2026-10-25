import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ApiClient, ApiClientError } from '@couple/shared/api-client';

const REFRESH_KEY = 'en_refresh_token';
let accessToken: string | null = null;
const listeners = new Set<() => void>();

export const tokenStore = {
  getAccessToken: () => accessToken,
  setAccessToken: (t: string | null) => {
    accessToken = t;
    listeners.forEach((l) => l());
  },
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY),
  setRefreshToken: async (t: string | null) => {
    if (t) await SecureStore.setItemAsync(REFRESH_KEY, t, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:4000';

export const api = new ApiClient({
  baseUrl: API_URL,
  platform: Platform.OS === 'ios' ? 'ios' : 'android',
  tokens: tokenStore,
  onUnauthenticated: () => tokenStore.setAccessToken(null),
});

export { ApiClientError };
export const errorCode = (err: unknown) => (err instanceof ApiClientError ? err.code : err instanceof TypeError ? 'NETWORK' : 'INTERNAL');
