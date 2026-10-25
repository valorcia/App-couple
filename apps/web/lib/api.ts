'use client';
import { ApiClient, ApiClientError } from '@couple/shared/api-client';

let accessToken: string | null = null;
const listeners = new Set<() => void>();

export const tokenStore = {
  getAccessToken: () => accessToken,
  setAccessToken: (t: string | null) => {
    accessToken = t;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = new ApiClient({
  baseUrl: API_URL,
  platform: 'web',
  tokens: tokenStore,
  onUnauthenticated: () => tokenStore.setAccessToken(null),
});

export { ApiClientError };

/** Code d'erreur stable à partir d'une erreur quelconque (pour i18n). */
export function errorCode(err: unknown): string {
  if (err instanceof ApiClientError) return err.code;
  if (err instanceof TypeError) return 'NETWORK';
  return 'INTERNAL';
}
