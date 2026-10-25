import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';
export interface RateLimitOptions {
  /** Nom logique (ex: 'auth.login'). */
  name: string;
  limit: number;
  windowSec: number;
  /** 'ip' (défaut), 'user' ou 'ip+body:<champ>' (ex: e-mail). */
  by?: 'ip' | 'user' | `ip+body:${string}`;
}
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
