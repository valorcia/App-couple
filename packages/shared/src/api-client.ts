import type { ApiErrorBody } from './errors';

export type ClientPlatform = 'web' | 'ios' | 'android';

export interface TokenStore {
  getAccessToken(): string | null;
  setAccessToken(token: string | null): void;
  /** Clients natifs uniquement (le web utilise un cookie httpOnly). */
  getRefreshToken?(): Promise<string | null> | string | null;
  setRefreshToken?(token: string | null): Promise<void> | void;
}

export interface ApiClientOptions {
  baseUrl: string;
  platform: ClientPlatform;
  tokens: TokenStore;
  fetchImpl?: typeof fetch;
  onUnauthenticated?: () => void;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiClientError';
  }
  get code() {
    return this.body.code;
  }
}

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  signal?: AbortSignal;
  /** Interne : évite une boucle de refresh. */
  _retried?: boolean;
}

/**
 * Client HTTP typé partagé web/mobile. Gère l'access token, le refresh transparent
 * (cookie sur le web, jeton stocké sur mobile) et la normalisation des erreurs.
 */
export class ApiClient {
  private refreshing: Promise<boolean> | null = null;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: ApiClientOptions) {
    this.fetchImpl = opts.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  get<T>(path: string, options: Omit<RequestOptions, 'body'> = {}) {
    return this.request<T>('GET', path, options);
  }
  post<T>(path: string, body?: unknown, options: RequestOptions = {}) {
    return this.request<T>('POST', path, { ...options, body });
  }
  patch<T>(path: string, body?: unknown, options: RequestOptions = {}) {
    return this.request<T>('PATCH', path, { ...options, body });
  }
  put<T>(path: string, body?: unknown, options: RequestOptions = {}) {
    return this.request<T>('PUT', path, { ...options, body });
  }
  delete<T>(path: string, body?: unknown, options: RequestOptions = {}) {
    return this.request<T>('DELETE', path, { ...options, body });
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const { body, query, auth = true, signal } = options;
    const url = new URL(path.replace(/^\//, ''), this.opts.baseUrl.endsWith('/') ? this.opts.baseUrl : `${this.opts.baseUrl}/`);
    if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, String(v));

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Client-Platform': this.opts.platform,
      'X-Requested-With': 'EntreNous',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = this.opts.tokens.getAccessToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    const res = await this.fetchImpl(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: this.opts.platform === 'web' ? 'include' : 'omit',
      signal,
    });

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const data = text ? safeJson(text) : null;

    if (!res.ok) {
      const err = (data as ApiErrorBody | null) ?? { code: 'INTERNAL', message: res.statusText };
      if (res.status === 401 && auth && !options._retried && (err.code === 'AUTH_TOKEN_EXPIRED' || err.code === 'AUTH_TOKEN_INVALID' || err.code === 'UNAUTHORIZED')) {
        const refreshed = await this.refresh();
        if (refreshed) return this.request<T>(method, path, { ...options, _retried: true });
        this.opts.onUnauthenticated?.();
      }
      throw new ApiClientError(res.status, err);
    }
    return data as T;
  }

  /** Renouvelle l'access token. Partagé entre appels concurrents. */
  refresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const refreshToken = this.opts.platform === 'web' ? undefined : await this.opts.tokens.getRefreshToken?.();
      if (this.opts.platform !== 'web' && !refreshToken) return false;
      const res = await this.fetchImpl(new URL('auth/refresh', this.opts.baseUrl.endsWith('/') ? this.opts.baseUrl : `${this.opts.baseUrl}/`).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client-Platform': this.opts.platform, 'X-Requested-With': 'EntreNous' },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        credentials: this.opts.platform === 'web' ? 'include' : 'omit',
      });
      if (!res.ok) {
        this.opts.tokens.setAccessToken(null);
        await this.opts.tokens.setRefreshToken?.(null);
        return false;
      }
      const data = (await res.json()) as { tokens: { accessToken: string; refreshToken?: string } };
      this.opts.tokens.setAccessToken(data.tokens.accessToken);
      if (data.tokens.refreshToken) await this.opts.tokens.setRefreshToken?.(data.tokens.refreshToken);
      return true;
    } catch {
      return false;
    }
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
