# DATABASE_SCHEMA — Entre Nous

Source de vérité : `packages/database/prisma/schema.prisma`. Ce document décrit les
intentions, règles d'isolation et choix d'index. PostgreSQL 16, extension `citext`.

## 1. Conventions
- Identifiants : UUID v7 générés par l'application (triables, non devinables).
- Horodatages `timestamptz` ; `createdAt`, `updatedAt` partout ; `deletedAt` sur les
  entités soumises à suppression douce (purge différée).
- Toute entité **commune** porte `coupleId` (FK) ; toute entité **personnelle** porte
  `ownerUserId`. Les deux peuvent coexister (ex. : événement personnel visible en « Occupé »).
- Index composite `(coupleId, <tri>)` systématique sur les tables consultées par couple.
- Les contenus catalogue (questions, défis, envies, activités, missions) sont des tables
  CMS versionnées par `status` et `locale`, sans lien avec un couple.

## 2. Domaines et entités

### Identité et couple
| Table | Rôle | Points clés |
| --- | --- | --- |
| `User` | compte | `email citext unique`, `passwordHash`, `role` (USER/SUPPORT/ADMIN), `status`, `emailVerifiedAt`, `adultConfirmedAt`, `locale`, `timezone`, `deletedAt` |
| `Profile` | profil public au partenaire | `displayName`, `avatarKey`, `interests[]`, `bio` |
| `OAuthAccount` | Apple/Google | `(provider, providerAccountId)` unique |
| `Session` | refresh tokens | `tokenHash unique`, `familyId`, `expiresAt`, `revokedAt`, `userAgent`, `ip` |
| `EmailVerificationToken`, `PasswordResetToken` | jetons hachés, expirables | |
| `Couple` | espace commun | `status` ACTIVE/DISSOLVED, `metAt`, `anniversaryAt`, `settings jsonb` |
| `CoupleMembership` | appartenance | `(coupleId, userId)` unique ; **index unique partiel** `userId WHERE leftAt IS NULL` (un seul couple actif) |
| `Invitation` | code d'association | `codeHash unique`, `expiresAt`, `acceptedAt`, `revokedAt` |
| `ConsentRecord` | consentements | `scope` (TERMS, PRIVACY, INTIMACY, AI_MEMORIES, MARKETING…), `version`, `grantedAt`, `revokedAt` |

### Monétisation
| Table | Rôle |
| --- | --- |
| `Product` | catalogue vendable (SUBSCRIPTION/PACK), prix configurables, ids Stripe/Apple/Google |
| `Subscription` | état par couple et fournisseur (`providerSubscriptionId` unique) |
| `Purchase` | achats ponctuels (`providerTransactionId` unique) |
| `Entitlement` | droits effectifs du couple : `key` (`premium`, `pack:<code>`), `source`, `expiresAt` ; `(coupleId, key)` unique |
| `PromoCode`, `Referral` | marketing (Phase 5) |

### Agenda
| Table | Rôle |
| --- | --- |
| `Calendar` | calendrier logique (personnel ou de couple), couleur, source |
| `CalendarEvent` | `ownerUserId`, `coupleId`, `visibility` PRIVATE/SHARED/BUSY, `type`, `startAt/endAt/allDay/timezone`, `rrule`, `exdates`, `location`, `color`, `externalId`, `iCalUid`, `surpriseId?` |
| `EventAttendee` | invitation interne (PENDING/ACCEPTED/DECLINED) |
| `EventReminder` | `minutesBefore`, canal |
| `CalendarConnection` | OAuth externe : `provider`, `accessTokenEnc`, `refreshTokenEnc`, `syncToken`, `status`, `lastSyncAt` |
| `CalendarSyncLog` | journal des synchronisations et conflits |

Index : `(coupleId, startAt)`, `(ownerUserId, startAt)`, `(connectionId, externalId)` unique.

### Quotidien
`ShoppingList`, `ShoppingItem` (`checkedAt`, `checkedByUserId`, `position`), `Task`
(`assigneeUserId?` volontaire, `priority`, `dueAt`, `rrule`), `TaskComment`, `Project`,
`ProjectStep`, `ProjectNote`, `ProjectDocument` (clé S3), `FamilyMember` (prénom, date de
naissance facultative — jamais exposé hors du couple).

### Jeux
| Table | Rôle |
| --- | --- |
| `Question` | catalogue : `gameType`, `category`, `level`, `tier`, `locale`, `status`, `payload jsonb` (options pour dilemmes, etc.) |
| `GameSession` | `coupleId`, `gameType`, `status` (OPEN/COMPLETED/ABANDONED), `config jsonb`, `createdByUserId` |
| `GameParticipant` | `(sessionId, userId)` |
| `GameRound` | `sessionId`, `index`, `questionId`, `revealedAt` — la révélation est un fait serveur |
| `Answer` | `roundId`, `userId`, `payload jsonb`, `(roundId, userId)` unique — **jamais lue par le partenaire tant que `GameRound.revealedAt` est null** |
| `Challenge` | catalogue de défis (`durationMinutes`, `difficulty`, `budget`, `materials[]`, `steps[]`) |
| `ChallengeProgress` | par couple : `status` (PROPOSED/ACCEPTED/SKIPPED/COMPLETED), `completedByUserIds[]` |
| `DailyQuestion` | question du jour attribuée par couple et date (`(coupleId, date)` unique) |

### Intimité
| Table | Rôle |
| --- | --- |
| `IntimacySetting` | par `(coupleId, userId)` : `enabledAt`, `disabledAt`, catégories activées |
| `DesireItem` | catalogue : `category`, `intensity`, `locale`, `tier`, texte |
| `DesireResponse` | `(coupleId, userId, itemId)` unique, `choice` YES/NO/MAYBE, `updatedAt` |
| `DesireReveal` | `(coupleId, itemId)` : `requestedByUserIds[]`, `revealedAt` — révélé uniquement si les deux ont demandé |

L'intersection est calculée en SQL côté serveur ; aucune API ne renvoie une réponse
individuelle à l'autre partenaire. Les `payload`/texte de `DesireResponse` ne contiennent
que l'id d'item et le choix.

### Expériences, surprises, missions
`Experience` (`params jsonb`, `result jsonb`, `source` AI/CATALOG, `savedAt`),
`ActivityIdea` (catalogue « On fait quoi ? » : `moment[]`, `withWho`, `budget`, `mood[]`,
`durationMinutes`, `indoor`), `Surprise` (`creatorUserId`, `coupleId`, `scheduledAt`,
`status`, `hints jsonb`, `revealAt`, `details jsonb` — lisibles par le créateur seul
jusqu'à révélation), `Mission` (catalogue), `MissionStep`, `MissionProgress`.

### Souvenirs
`Album`, `Memory` (`title`, `happenedAt`, `place?`, `note`), `MemoryAsset` (`storageKey`,
`mimeType`, `sizeBytes`, `width/height`, `status` PENDING/READY/FAILED), `StorageUsage`
(agrégat par couple).

### IA
`AIConversation` (`coupleId`, `mode` PERSONAL/SHARED, `ownerUserId` si PERSONAL),
`AIMessage` (`role`, `content`, `toolCalls jsonb`), `AIUsage` (`userId`, `coupleId`,
`feature`, `inputTokens`, `outputTokens`, `costMicros`, `provider`, `model`),
`AIPromptTemplate` (admin, versionné).

### Notifications
`PushDevice` (`expoPushToken` unique, plateforme), `Notification` (`userId`, `type`,
`title`, `body` **non sensible**, `data jsonb`, `readAt`), `NotificationPreference`
(`userId`, `category`, `push`, `inApp`, `quietStart`, `quietEnd`, `maxPerDay`).

### Plateforme
`FeatureFlag` (`key`, `enabled`, `rules jsonb`), `AppSetting` (`key`, `value jsonb` :
quotas, prix par défaut, limites), `AuditLog` (`actorUserId`, `action`, `targetType`,
`targetId`, `metadata`, `ip`), `DataExportRequest`, `AccountDeletionRequest`,
`ContentPack` (regroupe des contenus pour les `Product` PACK), `Translation`
(`namespace`, `key`, `locale`, `value`) pour les textes CMS.

## 3. Isolation et contrôle d'accès
1. Le `coupleId` provient toujours du token / de la membership active, jamais de l'URL.
2. Les services exposent des méthodes `forCouple(coupleId)` ; les requêtes « cross-couple »
   sont interdites hors administration, et l'administration **n'a pas** d'accès aux
   `Answer`, `DesireResponse`, `AIMessage` PERSONAL, `Memory` (seuls les agrégats sont
   exposés : compteurs, volumes).
3. Les tests d'autorisation (`apps/api/test/authz.*.spec.ts`) vérifient qu'un
   utilisateur d'un couple B ne peut lire/écrire aucune ressource d'un couple A, et
   qu'un partenaire ne lit pas les ressources privées de l'autre.

## 4. Politique de suppression et conservation
| Donnée | Règle |
| --- | --- |
| Compte supprimé | anonymisation immédiate (e-mail → hash, profil effacé), purge complète J+30 (sauf obligations légales de facturation : factures conservées 10 ans sans données personnelles au-delà du nécessaire) |
| Couple dissous | données communes lisibles 30 jours, puis archivées (lecture seule) 12 mois, puis purgées ; un ex-partenaire peut demander la suppression anticipée de ses contributions |
| Réponses intimes | supprimables à tout moment par leur auteur ; retrait du consentement = masquage immédiat, purge J+7 |
| Conversations IA personnelles | 12 mois glissants par défaut (paramètre utilisateur) |
| Sessions | 30 jours (refresh), purge quotidienne |
| Logs d'audit admin | 3 ans |
| Notifications | 90 jours |

## 5. Transactions et intégrité
- Association d'un couple : transaction sérialisable (vérification membership active,
  consommation de l'invitation, création membership).
- Révélation d'un round : transaction `SELECT … FOR UPDATE` sur le round, vérifie que les
  deux réponses existent avant d'écrire `revealedAt`.
- Webhooks paiement : idempotence par `eventId` (`WebhookEvent` table).

## 6. Sauvegardes
Postgres managé avec snapshots quotidiens + PITR 7 jours ; export hebdomadaire chiffré
hors fournisseur. Stockage objet versionné avec cycle de vie (suppression différée 30 j).
