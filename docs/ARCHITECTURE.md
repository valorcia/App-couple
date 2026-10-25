# ARCHITECTURE — Entre Nous

## 1. Vue d'ensemble

```
┌────────────┐   ┌────────────┐   ┌────────────┐
│  apps/web  │   │ apps/mobile│   │ apps/admin │
│  Next.js   │   │ Expo (RN)  │   │  Next.js   │
└─────┬──────┘   └─────┬──────┘   └─────┬──────┘
      │ HTTPS/JSON + WebSocket (Socket.IO)│
      └──────────────┬───────────────────┘
                     ▼
              ┌────────────┐      ┌─────────┐
              │  apps/api  │─────▶│  Redis  │ cache, quotas, files BullMQ, pub/sub WS
              │  NestJS 11 │      └─────────┘
              └─────┬──────┘      ┌─────────┐
                    ├────────────▶│Postgres │ Prisma
                    │             └─────────┘
                    ├────────────▶ S3 compatible (médias privés, URL signées)
                    ├────────────▶ Stripe / RevenueCat (webhooks)
                    ├────────────▶ Fournisseur IA (abstraction @couple/ai)
                    ├────────────▶ E-mail transactionnel (abstraction)
                    └────────────▶ Expo Push → APNs / FCM
```

Monolithe modulaire NestJS : un seul déploiement API au lancement, découpé en modules
métier étanches (auth, users, couples, calendar, games, intimacy, billing, ai, …). Les
traitements asynchrones (e-mails, push, synchronisation calendrier, génération IA longue,
export RGPD, purge) passent par des files BullMQ consommées par un **worker** (même code,
rôle `WORKER_MODE=true`), ce qui permet de scaler API et workers séparément sans
microservices prématurés.

## 2. Stack retenue

| Couche | Choix | Justification |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo | Cache de build, pipelines, partage de packages |
| API | NestJS 11, TypeScript strict | Modules, DI, guards, OpenAPI natif |
| Validation | **zod** (packages/validation) partagé API/web/mobile | Une seule source de vérité des contrats ; écart justifié vs class-validator (voir DECISIONS) |
| ORM | Prisma 6 + PostgreSQL 16 | Migrations versionnées, typage, `citext`, index partiels via SQL |
| Cache / files | Redis 7 (ioredis, BullMQ) | Quotas, rate limiting, cache IA, files, adaptateur Socket.IO |
| Temps réel | Socket.IO (gateway Nest) rooms par couple | Jeux, listes, agenda en direct |
| Web | Next.js 15 (App Router), React 19, Tailwind 4, TanStack Query 5 | Rendu hybride, SEO du site marketing, mutualisation du design system |
| Mobile | Expo SDK 52+, Expo Router, React Native | Build EAS, OTA, push unifié |
| Admin | Next.js séparé (apps/admin) | Surface d'attaque isolée, domaine et déploiement distincts |
| Paiements | Stripe (web) ; RevenueCat (iOS/Android) | Conformité boutiques ; entitlements centralisés côté API via webhooks |
| IA | Abstraction `AiProvider` (Anthropic par défaut, OpenAI-compatible optionnel) | Fournisseur configurable, sorties JSON validées par zod |
| Médias | Stockage S3 compatible (AWS S3 / Cloudflare R2 / MinIO en dev) | URL présignées, jamais public |
| E-mail | Abstraction `MailProvider` (Resend / SMTP / console) | Aucune dépendance forte |
| Tests | Vitest (unit/intégration/API), Playwright (e2e web), Jest-Expo (mobile) | |
| CI/CD | GitHub Actions | lint, typecheck, tests avec services Postgres/Redis |

## 3. Monorepo

```
apps/api       NestJS. src/modules/<domaine>/{*.controller,*.service,*.module}.ts
apps/web       Next.js. app/(marketing) site public ; app/(app) application connectée
apps/admin     Next.js. Back-office (auth admin séparée, 2FA prévue)
apps/mobile    Expo Router. app/(auth), app/(tabs)
packages/database    prisma/schema.prisma, migrations, client, seed
packages/validation  zod : auth, couple, calendar, games, billing, …
packages/types       types dérivés des schémas zod + enums partagés
packages/shared      erreurs typées (AppError), dates (dayjs/Temporal), i18n helpers
packages/ui          tokens CSS (clair/sombre), composants React web
packages/game-engine logique pure des jeux (états, révélation, matching Double Secret)
packages/ai          interface AiProvider, prompts, parsing JSON sûr, estimation coûts
packages/config      tsconfig de base, eslint, prettier, env schema (zod)
```

Chaque package est en TypeScript pur consommé via `exports` (sources transpilées par
l'app consommatrice : Next `transpilePackages`, Nest via `tsconfig paths`/`tsx`), ce qui
évite une étape de build par package au lancement. Un build `tsc` par package sera ajouté
si le temps de compilation le justifie.

## 4. Backend — principes

### 4.1 Authentification et sessions
- Mot de passe : argon2id. E-mail unique (`citext`). Vérification e-mail obligatoire pour
  les actions de couple.
- **Access token** JWT HS256 (15 min) porté en `Authorization: Bearer`. Contient
  `sub`, `role`, `cid` (couple actif) et `sv` (session version pour révocation).
- **Refresh token** opaque (32 octets aléatoires), stocké haché (SHA-256) dans `Session`,
  rotation à chaque usage, détection de réutilisation (révocation de la famille).
  Web : cookie `httpOnly; Secure; SameSite=Lax; Path=/auth` + en-tête `X-Requested-With`
  obligatoire (anti-CSRF). Mobile : SecureStore, envoyé dans le corps.
- OAuth Apple/Google : prévus (table `OAuthAccount`), implémentation Phase 5.
- Admin : rôle `ADMIN`/`SUPPORT` + TOTP (Phase 5), journalisation `AuditLog`.

### 4.2 Autorisation
- `JwtAuthGuard` → `CoupleGuard` (charge l'appartenance active) → décorateurs
  `@CurrentUser()`, `@CurrentCouple()`.
- Toute requête Prisma sur une ressource commune inclut `where: { coupleId }` depuis le
  contexte authentifié, jamais depuis un paramètre client.
- Les projections de confidentialité (événement privé → « Occupé », réponses cachées
  jusqu'à révélation, intersection Double Secret) sont faites dans les services, avec
  des **DTO de sortie explicites** (pas de `select *`).

### 4.3 Validation et erreurs
- `ZodValidationPipe` global. Erreurs normalisées `{ code, message, details?, requestId }`.
- Codes d'erreur stables (`AUTH_INVALID_CREDENTIALS`, `COUPLE_ALREADY_LINKED`, …) partagés
  dans `packages/shared` pour l'i18n côté clients.

### 4.4 Temps réel
Gateway Socket.IO authentifiée par access token ; room `couple:<id>` ; événements
`calendar.event.upsert`, `game.session.updated`, `shopping.item.updated`, etc. Adaptateur
Redis pour plusieurs instances.

### 4.5 Files et tâches planifiées
BullMQ : `mail`, `push`, `calendar-sync`, `ai`, `media`, `gdpr`. Planifications :
rappels d'événements, question du jour, purge, synchronisations périodiques.

### 4.6 IA
`packages/ai` expose `generateStructured<T>(prompt, schema: ZodSchema<T>, opts)` :
- prompts système versionnés, données utilisateur injectées en **données** (délimitées,
  jamais en instructions) ;
- sortie JSON validée, re-tentative unique en cas d'invalidité ;
- quotas Redis par utilisateur et par couple (plan FREE/PREMIUM) ;
- cache des suggestions non personnalisées (clé = paramètres normalisés) ;
- journalisation `AIUsage` (tokens, coût estimé) sans contenu sensible ;
- modération d'entrée/sortie (liste de refus + classification fournisseur si dispo) ;
- aucune promesse de réservation : le schéma de sortie n'a pas de champ « réservé ».

### 4.7 Paiements et droits
- `Product` (admin) → identifiants Stripe/Apple/Google. Webhooks Stripe et RevenueCat →
  `Subscription`/`Purchase` → recalcul des `Entitlement` du couple.
- `EntitlementService.has(coupleId, 'premium' | 'pack:<code>')` utilisé par
  `@RequireEntitlement()`. Les quotas gratuits sont vérifiés côté serveur.

### 4.8 Médias
Upload direct vers S3 via URL présignée (PUT), enregistrement `MemoryAsset` après
confirmation, traitement asynchrone (miniatures, strip EXIF/GPS si l'utilisateur ne veut
pas de lieu), lecture via URL présignée courte (5 min). Quotas de stockage par couple
(paramètre).

### 4.9 Calendriers externes
`CalendarConnection` (OAuth Google / Microsoft, tokens chiffrés AES-256-GCM) ; sync
incrémentale (syncToken / deltaLink), mapping `externalId` ↔ `CalendarEvent`, résolution
de conflit « dernière modification gagne » avec journal, dédoublonnage par `iCalUID`.
Apple : pas d'API serveur publique → import/export ICS + abonnement ICS en lecture
(URL secrète par utilisateur). Détails en Phase 4.

## 5. Frontend — principes
- Design system unique (`packages/ui`) : tokens CSS, mode sombre via `data-theme`.
- Textes exclusivement via i18n (`next-intl` web, `i18n-js` mobile), fichiers
  `messages/fr.json` partagés dans `packages/shared/i18n`.
- Données : TanStack Query, client API typé (zod) dans `packages/shared/api-client`.
- États vides, skeletons, erreurs et offline (mobile) traités comme des écrans à part.
- Accessibilité : contraste AA, focus visibles, tailles tactiles ≥ 44 pt, labels.

## 6. Performance et évolutivité

| Phase | Utilisateurs | Infra cible | Objectifs |
| --- | --- | --- | --- |
| 1 | 1 000 | 1 API + 1 worker, Postgres managé (2 vCPU), Redis managé | p95 API < 300 ms, LCP web < 2,5 s |
| 2 | 10 000 | 2–3 API, 2 workers, read replica optionnelle, CDN médias | p95 < 300 ms, erreurs < 0,5 % |
| 3 | 100 000 | autoscaling API/workers, Postgres 4–8 vCPU + PgBouncer, Redis cluster | p95 < 400 ms sous charge |
| 4 | 500 000+ | partitionnement des tables volumineuses (events, answers, notifications) par `coupleId` hash, archivage froid | |

Leviers intégrés dès le départ : pagination par curseur, index composites `(coupleId, …)`,
cache Redis, tâches asynchrones, compression d'images, OpenTelemetry (traces/metrics),
logs JSON structurés (pino), health checks, budget de charge k6 (Phase 5).

## 7. Environnements et déploiement
- `development` (local, docker-compose Postgres/Redis/MinIO/Mailpit), `staging`,
  `production`. Variables via `.env` validées par zod au démarrage (échec rapide).
- CI GitHub Actions : install → lint → typecheck → tests (services Postgres/Redis) →
  build. Déploiement : API/worker en conteneurs (Dockerfile fournis), web/admin sur
  plateforme Next (Vercel ou conteneur), mobile via EAS.
- Migrations Prisma exécutées en job dédié avant le déploiement de l'API.
- Sauvegardes Postgres quotidiennes + PITR (fournisseur managé) ; procédure de
  restauration documentée dans `docs/RUNBOOK.md` (Phase 5).
