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
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
export const api = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  platform: 'web',
  tokens: tokenStore,
  onUnauthenticated: () => tokenStore.setAccessToken(null),
});
export { ApiClientError };
export const errorMessage = (err: unknown) => (err instanceof ApiClientError ? `${err.code} — ${err.message}` : 'Erreur réseau');
