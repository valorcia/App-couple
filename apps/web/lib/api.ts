'use client';
import { ApiClient, ApiClientError } from '@couple/shared/api-client';
import { isDemo } from './demo/mode';
import type { DemoApi } from './demo/api';

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

const real = new ApiClient({
  baseUrl: API_URL,
  platform: 'web',
  tokens: tokenStore,
  onUnauthenticated: () => tokenStore.setAccessToken(null),
});

let demo: DemoApi | null = null;
/** API simulée du mode démo, chargée à la demande (jamais incluse dans le parcours réel). */
async function demoApi(): Promise<DemoApi> {
  if (!demo) {
    const mod = await import('./demo/api');
    demo = new mod.DemoApi();
  }
  return demo;
}

type Opts = { query?: Record<string, string | number | boolean | undefined>; auth?: boolean; signal?: AbortSignal };

/**
 * Client API de l'application. En mode démo (navigateur uniquement, données fictives),
 * chaque appel est servi par le simulateur local au lieu du réseau.
 */
export const api = {
  get: <T,>(path: string, options: Opts = {}) => (isDemo() ? demoApi().then((d) => d.request<T>('GET', path, options)) : real.get<T>(path, options)),
  post: <T,>(path: string, body?: unknown, options: Opts = {}) => (isDemo() ? demoApi().then((d) => d.request<T>('POST', path, { ...options, body })) : real.post<T>(path, body, options)),
  patch: <T,>(path: string, body?: unknown, options: Opts = {}) => (isDemo() ? demoApi().then((d) => d.request<T>('PATCH', path, { ...options, body })) : real.patch<T>(path, body, options)),
  put: <T,>(path: string, body?: unknown, options: Opts = {}) => (isDemo() ? demoApi().then((d) => d.request<T>('PUT', path, { ...options, body })) : real.put<T>(path, body, options)),
  delete: <T,>(path: string, body?: unknown, options: Opts = {}) => (isDemo() ? demoApi().then((d) => d.request<T>('DELETE', path, { ...options, body })) : real.delete<T>(path, body, options)),
  refresh: () => (isDemo() ? Promise.resolve(true) : real.refresh()),
};

export { ApiClientError };

/** Code d'erreur stable à partir d'une erreur quelconque (pour i18n). */
export function errorCode(err: unknown): string {
  if (err instanceof ApiClientError) return err.code;
  if (err instanceof TypeError) return 'NETWORK';
  return 'INTERNAL';
}
