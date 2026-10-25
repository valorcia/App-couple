/** DTO de sortie de l'API (contrats publics). Jamais les entités Prisma brutes. */

export type UserRole = 'USER' | 'SUPPORT' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_DELETION' | 'DELETED';
export type CoupleStatus = 'PENDING' | 'ACTIVE' | 'DISSOLVED';

export interface ProfileDto {
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  interests: string[];
}

export interface MeDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  adultConfirmed: boolean;
  locale: string;
  timezone: string;
  profile: ProfileDto;
  couple: CoupleDto | null;
  entitlements: string[];
  createdAt: string;
}

/** Vue du partenaire : uniquement ce qui est public au sein du couple. */
export interface PartnerDto {
  id: string;
  profile: ProfileDto;
  joinedAt: string;
}

export interface CoupleDto {
  id: string;
  status: CoupleStatus;
  name: string | null;
  metAt: string | null;
  anniversaryAt: string | null;
  partner: PartnerDto | null;
  activatedAt: string | null;
  createdAt: string;
  pendingInvitation: InvitationDto | null;
}

export interface InvitationDto {
  id: string;
  /** Code en clair uniquement à la création (jamais relu depuis la base). */
  code?: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  /** Présent pour les clients natifs ; en cookie httpOnly pour le web. */
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthResponseDto {
  tokens: AuthTokensDto;
  user: MeDto;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface FeatureFlagDto {
  key: string;
  description: string | null;
  enabled: boolean;
  rules: Record<string, unknown>;
}

export interface AppSettingDto {
  key: string;
  value: unknown;
  description: string | null;
}

export interface ProductDto {
  id: string;
  code: string;
  type: 'SUBSCRIPTION' | 'PACK';
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: 'MONTH' | 'YEAR' | null;
  entitlementKey: string;
  active: boolean;
}

export interface AdminUserDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  displayName: string | null;
  emailVerified: boolean;
  coupleId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminStatsDto {
  users: number;
  activeUsers30d: number;
  couplesActive: number;
  premiumCouples: number;
  signups7d: number;
}
