/**
 * Codes d'erreur stables partagés API ⇄ clients. Les clients traduisent par code.
 */
export const ErrorCode = {
  // Génériques
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_TAKEN: 'AUTH_EMAIL_TAKEN',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_REUSED: 'AUTH_TOKEN_REUSED',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  AUTH_PASSWORD_WEAK: 'AUTH_PASSWORD_WEAK',
  AUTH_CSRF: 'AUTH_CSRF',
  // Couple
  COUPLE_REQUIRED: 'COUPLE_REQUIRED',
  COUPLE_ALREADY_LINKED: 'COUPLE_ALREADY_LINKED',
  COUPLE_FULL: 'COUPLE_FULL',
  COUPLE_NOT_ACTIVE: 'COUPLE_NOT_ACTIVE',
  INVITATION_INVALID: 'INVITATION_INVALID',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_SELF: 'INVITATION_SELF',
  INVITATION_LIMIT: 'INVITATION_LIMIT',
  // Droits / abonnements
  ENTITLEMENT_REQUIRED: 'ENTITLEMENT_REQUIRED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  BILLING_UNAVAILABLE: 'BILLING_UNAVAILABLE',
  BILLING_NO_CUSTOMER: 'BILLING_NO_CUSTOMER',
  // Consentement / intimité
  ADULT_CONFIRMATION_REQUIRED: 'ADULT_CONFIRMATION_REQUIRED',
  INTIMACY_NOT_ENABLED: 'INTIMACY_NOT_ENABLED',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  // Jeux
  GAME_ALREADY_ANSWERED: 'GAME_ALREADY_ANSWERED',
  GAME_NOT_REVEALED: 'GAME_NOT_REVEALED',
  GAME_SESSION_CLOSED: 'GAME_SESSION_CLOSED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  code: ErrorCode | string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(message = 'Ressource introuvable') {
    return new AppError(ErrorCode.NOT_FOUND, message, 404);
  }
  static forbidden(message = 'Accès refusé') {
    return new AppError(ErrorCode.FORBIDDEN, message, 403);
  }
  static unauthorized(message = 'Authentification requise') {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }
  static conflict(code: ErrorCode | string, message: string) {
    return new AppError(code, message, 409);
  }
}
