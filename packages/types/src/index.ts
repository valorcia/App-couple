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
  mrrCents: number;
  activeSubscriptions: number;
}

// ---------------------------------------------------------------- Agenda
export type EventVisibility = 'PRIVATE' | 'SHARED' | 'BUSY';
export type EventType = 'PERSONAL' | 'SHARED' | 'FAMILY' | 'WORK' | 'SURPRISE' | 'VACATION' | 'DATE' | 'BIRTHDAY' | 'OTHER';
export type AttendeeStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface EventReminderDto {
  id: string;
  minutesBefore: number;
  channel: string;
}

export interface EventAttendeeDto {
  userId: string;
  status: AttendeeStatus;
  respondedAt: string | null;
}

/** Événement tel que vu par l'utilisateur courant. Un événement « Occupé » du partenaire est projeté : `busy: true`, sans détails. */
export interface CalendarEventDto {
  id: string;
  /** Identifiant d'occurrence (événements récurrents) : `${id}@${startAt}`. */
  instanceId: string;
  ownerUserId: string;
  isMine: boolean;
  busy: boolean;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timezone: string;
  visibility: EventVisibility;
  type: EventType;
  color: string | null;
  category: string | null;
  rrule: string | null;
  exdates: string[];
  isRecurring: boolean;
  reminders: EventReminderDto[];
  attendees: EventAttendeeDto[];
  canEdit: boolean;
  surpriseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FreeSlotDto {
  startAt: string;
  endAt: string;
  minutes: number;
}

// ---------------------------------------------------------------- Jeux
export type GameType = 'SECRET_ANSWERS' | 'WHO_KNOWS_BEST' | 'DILEMMA' | 'WHICH_OF_US' | 'CHALLENGE' | 'CONFESSIONS' | 'MEMORY_QUIZ';
export type GameSessionStatus = 'OPEN' | 'COMPLETED' | 'ABANDONED';
export type AnswerPayloadDto = { kind: 'text'; text: string } | { kind: 'choice'; index: number } | { kind: 'vote'; userId: string };

export interface GameCategoryDto {
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  questionCount: number;
  locked: boolean;
}

export interface GameCatalogEntryDto {
  gameType: GameType;
  available: boolean;
  categories: GameCategoryDto[];
  totalQuestions: number;
}

export interface GameCatalogDto {
  games: GameCatalogEntryDto[];
  premium: boolean;
  sessionsLeftToday: number | null;
}

export interface GameRoundDto {
  index: number;
  prompt: { text: string; options?: string[]; subjectUserId?: string; categoryCode?: string | null; level?: number };
  /** Ma réponse (si j'ai répondu). */
  myAnswer: AnswerPayloadDto | null;
  partnerAnswered: boolean;
  revealedAt: string | null;
  /** Réponse du partenaire : présente uniquement après révélation. */
  partnerAnswer: AnswerPayloadDto | null;
  skipped: boolean;
  verdict: 'EXACT' | 'CLOSE' | 'MISS' | null;
  /** Qui doit donner le verdict (Qui connaît le mieux) : le sujet, après révélation. */
  awaitingVerdictFrom: string | null;
  funLine: string | null;
}

export interface GameSessionDto {
  id: string;
  gameType: GameType;
  status: GameSessionStatus;
  createdByUserId: string;
  participantIds: string[];
  rounds: GameRoundDto[];
  currentRoundIndex: number | null;
  summary: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
}

export interface GameSessionListItemDto {
  id: string;
  gameType: GameType;
  status: GameSessionStatus;
  roundsTotal: number;
  roundsClosed: number;
  /** Une manche attend ma réponse. */
  myTurn: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface DailyQuestionDto {
  id: string;
  date: string;
  text: string;
  categoryCode: string | null;
  myAnswer: string | null;
  partnerAnswered: boolean;
  revealedAt: string | null;
  partnerAnswer: string | null;
}

// ---------------------------------------------------------------- Défis
export type ChallengeProgressStatus = 'PROPOSED' | 'ACCEPTED' | 'SKIPPED' | 'COMPLETED';

export interface ChallengeDto {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  durationMinutes: number | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  budget: 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH';
  materials: string[];
  intimate: boolean;
  category: { code: string; name: string } | null;
  tags: string[];
  locked: boolean;
  progress: ChallengeProgressDto | null;
}

export interface ChallengeProgressDto {
  id: string;
  challengeId: string;
  status: ChallengeProgressStatus;
  proposedByUserId: string | null;
  completedByUserIds: string[];
  /** J'ai validé ma part. */
  completedByMe: boolean;
  completedByPartner: boolean;
  note: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface ChallengeFeaturedDto {
  /** Défi en cours (proposé/accepté) ou suggestion du jour. */
  challenge: ChallengeDto | null;
  kind: 'active' | 'suggestion' | null;
}

// ---------------------------------------------------------------- Intimité
export type IntimacyCategory = 'tenderness' | 'romance' | 'seduction' | 'complicity' | 'desires' | 'fantasies' | 'experiences';
export type DesireChoice = 'YES' | 'NO' | 'MAYBE';

export interface IntimacySettingsDto {
  adultConfirmed: boolean;
  moduleAvailable: boolean;
  enabled: boolean;
  enabledCategories: IntimacyCategory[];
  maxIntensity: number;
  /** Le partenaire a activé l'espace (booléen uniquement, aucun autre détail). */
  partnerEnabled: boolean;
  bothEnabled: boolean;
  premium: boolean;
}

export interface DesireItemDto {
  id: string;
  category: IntimacyCategory;
  intensity: number;
  text: string;
  locked: boolean;
  /** Mon choix. Celui du partenaire n'est JAMAIS exposé ici. */
  myChoice: DesireChoice | null;
}

export interface DesireMatchesDto {
  /** Nombre d'envies sélectionnées « Oui » par les deux. */
  mutualCount: number;
  /** Envies communes révélées d'un commun accord (et toujours « Oui » des deux côtés). */
  revealed: { id: string; category: IntimacyCategory; intensity: number; text: string; revealedAt: string }[];
  /** Nombre d'envies communes non encore révélées. */
  pendingCount: number;
  iRequested: boolean;
  partnerRequested: boolean;
  myAnswersCount: number;
}

// ---------------------------------------------------------------- « On fait quoi ? »
export type IdeaMoment = 'NOW' | 'TONIGHT' | 'WEEKEND' | 'DATE';
export type IdeaCompany = 'COUPLE' | 'FAMILY';
export type IdeaBudget = 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type IdeaMood = 'ROMANTIC' | 'FUNNY' | 'RELAX' | 'ADVENTURE' | 'CULTURE' | 'FOOD' | 'SPICY';

export interface IdeaDto {
  id: string;
  source: 'CATALOG' | 'AI';
  title: string;
  description: string;
  budget: IdeaBudget;
  durationMinutes: number | null;
  indoor: boolean | null;
  moods: IdeaMood[];
  tags: string[];
  /** Déjà réalisée par le couple (info, pas une exclusion stricte). */
  doneBefore: boolean;
}

export interface IdeaSuggestionsDto {
  ideas: IdeaDto[];
  /** Fenêtre proposée pour l'ajout à l'agenda. */
  suggestedStartAt: string;
  suggestedEndAt: string;
  ai: { used: boolean; reason: 'disabled' | 'quota' | 'error' | 'off' | null; remainingThisMonth: number | null };
}

export interface ScheduledIdeaDto {
  eventId: string;
  experienceId: string;
}

// ---------------------------------------------------------------- Abonnements
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'PAUSED';
export type PaymentProvider = 'STRIPE' | 'APPLE' | 'GOOGLE' | 'MANUAL';

export interface BillingProductDto extends ProductDto {
  checkoutAvailable: boolean;
}

export interface BillingStatusDto {
  premium: boolean;
  entitlements: string[];
  subscription: {
    provider: PaymentProvider;
    status: SubscriptionStatus;
    productCode: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    /** Où gérer l'abonnement : Stripe (web), App Store, Play Store, ou manuel (admin). */
    manageVia: 'stripe' | 'apple' | 'google' | 'manual';
  } | null;
  checkoutAvailable: boolean;
}

export interface CheckoutSessionDto {
  url: string;
}

export interface AdminSubscriptionDto {
  id: string;
  coupleId: string;
  provider: PaymentProvider;
  status: SubscriptionStatus;
  productCode: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------- Notifications
export type NotificationCategory = 'CALENDAR' | 'INVITATION' | 'GAME' | 'CHALLENGE' | 'SURPRISE' | 'ANNIVERSARY' | 'SUGGESTION' | 'DAILY_QUESTION' | 'SYSTEM' | 'MARKETING';

export interface NotificationDto {
  id: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferenceDto {
  category: NotificationCategory;
  push: boolean;
  inApp: boolean;
  email: boolean;
  maxPerDay: number | null;
}

export interface NotificationPreferencesDto {
  preferences: NotificationPreferenceDto[];
  quietStart: string | null;
  quietEnd: string | null;
  devices: { id: string; platform: string; deviceName: string | null; lastSeenAt: string }[];
}

// ---------------------------------------------------------------- Quotidien
export interface ShoppingItemDto {
  id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  position: number;
  checkedAt: string | null;
  checkedByUserId: string | null;
}
export interface ShoppingListDto {
  id: string;
  name: string;
  archivedAt: string | null;
  itemCount: number;
  checkedCount: number;
  items: ShoppingItemDto[];
  updatedAt: string;
}
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'OPEN' | 'DONE' | 'CANCELED';
export interface TaskCommentDto {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
}
export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  creatorUserId: string;
  assigneeUserId: string | null;
  projectId: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  rrule: string | null;
  completedAt: string | null;
  comments: TaskCommentDto[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------- Projets
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export interface ProjectStepDto {
  id: string;
  title: string;
  position: number;
  dueAt: string | null;
  completedAt: string | null;
}
export interface ProjectNoteDto {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
export interface ProjectDto {
  id: string;
  templateCode: string | null;
  title: string;
  goal: string | null;
  description: string | null;
  status: ProjectStatus;
  startAt: string | null;
  targetAt: string | null;
  budgetCents: number | null;
  currency: string;
  progress: number;
  steps: ProjectStepDto[];
  notes: ProjectNoteDto[];
  openTasks: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------- Intimité : signal « Ce soir ? »
export interface TonightDto {
  /** Mon signal est actif. */
  mine: boolean;
  /** Les deux signaux sont actifs. Faux tant que l'un des deux manque : aucune information sur le partenaire seul. */
  mutual: boolean;
  /** Fin de validité du signal (matin suivant, 5 h locale). */
  expiresAt: string | null;
}

// ---------------------------------------------------------------- Intimité : « Les cartes du soir »
export interface IntimacyCardDto {
  id: string;
  level: number;
  /** Qui réalise : celui qui a tiré (DRAWER), l'autre (PARTNER), ou les deux. */
  role: 'DRAWER' | 'PARTNER' | 'BOTH';
  text: string;
  durationSec: number | null;
}
export interface CardLevelDto {
  level: number;
  /** Autorisé par les réglages des deux partenaires (intensité maximale commune) et l'offre. */
  available: boolean;
  /** Raison si indisponible. */
  reason: 'intensity' | 'premium' | null;
  /** Cartes restantes ce soir à ce niveau. */
  remaining: number;
}
export interface CardTableDto {
  levels: CardLevelDto[];
  /** Carte sur la table, visible par les deux ; null si aucune. */
  current: { card: IntimacyCardDto; drawnByUserId: string; drawnAt: string } | null;
  /** Cartes réalisées ce soir. */
  doneCount: number;
  /** Fin de la soirée (5 h locale) : tout s'efface. */
  expiresAt: string | null;
}
