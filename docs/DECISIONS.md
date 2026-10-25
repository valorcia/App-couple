# DECISIONS — Registre des décisions (ADR) et arbitrages

## A. Arbitrages qui vous reviennent (réponses attendues)

| # | Question | Hypothèse retenue en attendant | Impact si différent |
| --- | --- | --- | --- |
| A1 | **Nom du produit et domaine.** « Entre Nous » est provisoire. | Codename `Entre Nous`, scope npm `@couple/*`, assistant « Notre Complice ». | Renommage des textes i18n et du site ; aucun impact code. |
| A2 | **Fournisseur IA par défaut.** | Anthropic (Claude) via `@couple/ai`, OpenAI-compatible en option. Clé fournie par vous, jamais versionnée. | Changement de l'adaptateur par défaut uniquement. |
| A3 | **Hébergement cible.** | Conteneurs API/worker (Fly.io, Render ou Scaleway), Postgres/Redis managés **en UE**, web/admin sur Vercel ou conteneur, médias Cloudflare R2 (UE). | Dockerfiles et CI fournis quoi qu'il arrive ; les scripts de déploiement spécifiques dépendent du choix. |
| A4 | **Abonnements mobiles : RevenueCat** (service tiers payant au-delà d'un seuil) ou implémentation directe StoreKit 2 / Play Billing ? | RevenueCat (délais et fiabilité des webhooks). | Implémentation directe = +2 à 3 semaines, maintenance accrue. |
| A5 | **Vérification de majorité** : simple déclaration datée (standard du marché) ou vérification renforcée ? | Déclaration explicite datée + CGU 18+ ; module Intimité en double opt-in. | Une vérification documentaire changerait profondément l'onboarding et la conformité. |
| A6 | **Comptes OAuth (Apple/Google) dès le MVP ?** Apple exige « Sign in with Apple » si un autre login social est proposé sur iOS. | E-mail/mot de passe au MVP ; Apple + Google en Phase 5 (avant soumission aux stores). | Avance le travail OAuth si vous le souhaitez plus tôt. |

Pour tout le reste, des décisions cohérentes ont été prises et sont listées ci-dessous.

## B. Décisions prises

### ADR-001 — Monolithe modulaire NestJS + worker, pas de microservices
Un seul code API avec modules étanches et un mode worker BullMQ. Suffisant jusqu'à
plusieurs centaines de milliers d'utilisateurs avec scaling horizontal ; découpage
ultérieur possible module par module.

### ADR-002 — zod partagé plutôt que class-validator
Les schémas de validation vivent dans `packages/validation` et servent l'API (pipe), le
web et le mobile (formulaires, client typé). Une seule définition des contrats. Écart par
rapport à l'habitude NestJS, justifié par le partage multi-apps.

### ADR-003 — Auth maison (argon2 + JWT court + refresh rotatif) plutôt qu'un service tiers
Contrôle complet des données (RGPD, données intimes), coût nul, pas de dépendance d'un
fournisseur pour la fonction la plus critique. OAuth Apple/Google s'ajoute dessus.

### ADR-004 — Entitlements au niveau du couple
Un abonnement couvre les deux partenaires. `Entitlement(coupleId, key)` est la seule
source consultée par le code métier ; Stripe et RevenueCat l'alimentent via webhooks.

### ADR-005 — Révélation et intersection calculées côté serveur
Les réponses individuelles ne quittent jamais le serveur avant un fait serveur
(`revealedAt`). L'intersection Double Secret est une requête SQL ; seul le résultat
mutuel est exposé.

### ADR-006 — UUID v7 générés côté application
Triables par temps (index B-tree efficaces), non devinables, indépendants de la base.

### ADR-007 — Chiffrement applicatif ciblé (AES-256-GCM)
Appliqué aux données les plus sensibles (jetons OAuth, messages IA, réponses intimes,
détails de surprise). Les autres champs restent chiffrés au repos par le fournisseur.
Recherche plein texte impossible sur ces champs : acceptable.

### ADR-008 — Admin dans une application Next.js séparée
Domaine, déploiement et politique CSP distincts ; aucune route admin dans l'app publique.

### ADR-009 — Next.js 15 / Tailwind 4 / React 19 ; Expo Router pour le mobile
Versions actuelles stables. `shadcn/ui` est utilisé comme **patron** (composants copiés et
adaptés aux tokens) et non comme dépendance, pour garder la direction artistique.

### ADR-010 — Catalogue de contenus en base, administré par CMS
Questions, défis, envies, activités, missions sont des données (`locale`, `tier`,
`status`), jamais du code. Seed de démonstration séparé des données de production.

### ADR-011 — Apple Calendar : ICS uniquement
Aucune API serveur publique pour iCloud Calendar. Import/export ICS + flux ICS en lecture.
Documenté comme limitation.

### ADR-012 — Pas de SDK publicitaire, analytics agrégés sans cookies tiers
Conformité et positionnement premium.

### ADR-013 — Prisma 6 (et non 7) au lancement
Prisma 7 change le moteur (driver adapters obligatoires, `prisma.config.ts`, nouveau générateur).
Prisma 6.19 est stable, bien documenté et suffisant ; la migration vers 7 est planifiée après la
Phase 3, une fois le schéma stabilisé.

### ADR-014 — Exécution de l'API via `@swc-node/register`
Les packages du monorepo sont consommés en sources TypeScript (meilleure DX pour Next/Expo).
L'API NestJS a besoin des métadonnées de décorateurs (non supportées par esbuild/tsx) : SWC les
émet et résout les packages du workspace sans étape de build. Dev, tests (vitest + unplugin-swc)
et image Docker utilisent le même mécanisme. Un bundle précompilé pourra remplacer ce mode si le
temps de démarrage devient un sujet.

### ADR-015 — E2E sur build de production, serveur dev réservé au développement
Les tests Playwright démarrent l'API et un `next build && next start` (déterministe). Le serveur
de développement Next compile à la demande et produit des faux négatifs en e2e.
