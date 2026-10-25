# DEVELOPMENT_STATUS

Dernière mise à jour : 2026-10-25 — Phases 1, 2 et 3 terminées. **Phase 4 (fonctions avancées) en cours : jalon 1 livré (Quotidien : listes de courses, tâches, projets).**

## Fonctionnalités terminées

### Cadrage (Phase 1)
- `docs/` : PRODUCT_SPEC, ARCHITECTURE, DATABASE_SCHEMA, SECURITY, DESIGN_SYSTEM, ROADMAP, DECISIONS (arbitrages A1–A6 en attente de réponse).

### Socle (Phase 2)
- **Monorepo** pnpm + Turborepo ; packages `config`, `shared` (erreurs, ids UUID v7, crypto AES-GCM, client API), `validation` (zod partagé), `types` (DTO), `database` (Prisma 6), `ui` (design system).
- **Base de données** : schéma complet (toutes les entités du cahier des charges), migration initiale avec contraintes métier SQL (un seul couple actif par utilisateur, une invitation en attente par couple, trigger « deux membres max », cohérence des dates d'événement). Seed de démonstration idempotent (10 catégories, 72 questions, 10 défis, 18 envies, 16 idées d'activités, 2 produits, comptes démo hors production).
- **API NestJS** (`apps/api`) :
  - Auth : inscription (argon2id, robustesse serveur), vérification e-mail obligatoire, connexion, refresh rotatif avec détection de réutilisation (famille révoquée), déconnexion (locale / partout), mot de passe oublié / réinitialisation / changement, listing des sessions. Cookie httpOnly + anti-CSRF pour le web, jeton dans le corps pour le mobile.
  - Profil (`/me`), confirmation de majorité datée, consentements à l'inscription.
  - Couples : création + code d'invitation (haché, 72 h, usage unique), régénération limitée par jour, acceptation (transaction sérialisable), mise à jour, sortie unilatérale (dissolution), vue partenaire restreinte au profil public.
  - Entitlements (droits du couple) + garde `@RequireEntitlement`.
  - Admin (`/admin/*`, rôles ADMIN/SUPPORT) : stats, recherche utilisateurs (métadonnées seulement), suspension/réactivation avec raison journalisée, journal d'audit, feature flags, paramètres applicatifs (quotas), produits/prix.
  - Transverse : validation zod, erreurs normalisées `{code,message,details,requestId}`, rate limiting Redis, logs pino avec redaction, OpenAPI (`/docs`), santé (`/health/live`, `/health/ready`), boîte mail de dev (`/dev/mailbox`, hors production).
- **Web Next.js** (`apps/web`) : site marketing (accueil + pages légales à finaliser), inscription / connexion / vérification / mot de passe oublié / réinitialisation, espace connecté (coque + navigation desktop/mobile), tableau de bord (données réelles du couple, modules Phase 3 marqués « Bientôt disponible »), association du couple (inviter / rejoindre / attente / espace lié / quitter), profil (infos, langue, fuseau, thème clair/sombre, mot de passe, déconnexion globale). i18n centralisée (`messages/fr.json`), aucun texte en dur.
- **Admin Next.js** (`apps/admin`) : connexion réservée ADMIN/SUPPORT, tableau de bord, utilisateurs (recherche, suspension), produits & prix, feature flags, paramètres, journal d'audit.
- **Mobile Expo** (`apps/mobile`) : scaffold Expo Router (connexion, inscription, vérification, association du couple, onglets), client API partagé avec refresh token en SecureStore, thème clair/sombre. Non exécuté sur simulateur dans cette session (typecheck + lint uniquement).
- **Qualité / exploitation** : CI GitHub Actions (lint, typecheck, tests avec Postgres/Redis, build web/admin, e2e Playwright), Dockerfiles API/web/admin, docker-compose de dev (Postgres, Redis, MinIO, Mailpit), `.env.example` documenté.

### MVP (Phase 3) — livré
- **Agenda partagé** (API + web) : CRUD par couple, visibilité Partagé / Occupé uniquement (bloc sans titre ni détail) / Privé (invisible), récurrence RRULE avec heure locale préservée (DST), exclusion d'occurrence, rappels, invitation du partenaire (accepter/décliner) avec notifications in-app, créneaux libres communs (sans trahir les événements privés), temps réel Socket.IO (rooms user/couple, adaptateur Redis). Web : vues jour/semaine/mois, formulaire complet, fiche événement, événements à venir sur l'accueil.
- **Moteur de jeux** (`packages/game-engine`, logique pure testée) + API `games` : catalogue par type/catégorie avec verrouillage Premium, sessions courtes/longues, manches avec réponses **jamais exposées avant révélation** (transaction + verrou), passer une question (réponses effacées), verdict « Qui connaît le mieux » réservé au sujet, résumés de partie, quota gratuit configurable (`quota.free.gameSessionsPerDay`, `games.freeCategories`), question du jour commune (révélation quand les deux ont répondu), notifications et temps réel. Jeux livrés : Réponses secrètes, Qui connaît le mieux, Dilemmes, Lequel de nous deux, Confessions (niveaux). Web : catalogue, lancement, écran de jeu manche par manche, révélation, verdict, résumé, question du jour sur l'accueil.
- **Robustesse** : fenêtre de grâce de 30 s sur la rotation des refresh tokens (requêtes concurrentes), association de couples sans isolation sérialisable (intégrité par contraintes SQL, erreurs mappées).

- **Défis à deux** (API + web) : catalogue filtrable (budget, difficulté, durée), verrouillage gratuit (`quota.free.challengesCatalog`) et Premium, défis intimes visibles seulement si l'espace Intimité est actif des deux côtés, cycle proposer → accepter → chacun valide sa part → réussi ensemble, passer sans pénalité, note facultative, « Défi du moment » (en cours ou suggestion stable du jour) sur l'accueil, notifications.
- **Intimité & Double Secret** (API + web) : flag `intimacy.module`, confirmation de majorité datée, activation individuelle avec `ConsentRecord` INTIMACY (révocable), catalogue commun = intersection des catégories et intensités acceptées par chacun, réponses Oui / Non / Peut-être **jamais exposées au partenaire**, intersection des « Oui » calculée en SQL, révélation uniquement après demande des deux, retrait d'un « Oui » = disparition immédiate, suppression de ses réponses, notifications sans détail, audit sans contenu. Catégories gratuites configurables (`intimacy.freeCategories`).

- **« On fait quoi ? »** (API + web) : assistant en 4 étapes (quand / avec qui / budget / ambiance), propositions du catalogue `ActivityIdea` (filtres, idées intimes seulement si l'espace Intimité est actif, idées déjà réalisées signalées), enrichissement IA facultatif via `packages/ai` (fournisseur Anthropic ou OpenAI-compatible, sorties JSON validées, règles de sécurité anti-injection, quotas mensuels par couple, cache Redis, journal `AIUsage` sans contenu) avec repli honnête sur le catalogue (raison affichée : désactivé / quota / erreur), ajout à l'agenda partagé par confirmation explicite (événement DATE + invitation du partenaire) et trace `Experience`.

- **Abonnements & entitlements** (API + web + admin) : produits et prix administrables (`Product`), Stripe Checkout (abonnement ou pack) et Billing Portal, webhooks Stripe signés sur corps brut (`checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`) et RevenueCat (Bearer secret ; achats, renouvellements, annulation, expiration, packs non renouvelables), idempotence `WebhookEvent`, synchronisation des `Entitlement` du couple avec 3 jours de grâce, notifications d'échec de paiement, `GET /billing/status`, 503 `BILLING_UNAVAILABLE` sans clés (jamais de paiement simulé). Web : page Premium (offres, statut, portail), page de remerciement avec activation automatique, paywall contextuel sur les erreurs 402, statut dans le profil. Admin : liste des abonnements, abonnements actifs et MRR.

- **Notifications** (API + web + mobile) : files BullMQ (`push`, `reminders`, `daily`) consommées en ligne en dev/test ou par un worker dédié (`WORKER_MODE`), envoi push via l'API Expo par lots avec retrait des jetons invalides, préférences par catégorie (push / in-app / plafond quotidien), heures silencieuses globales avec report du push après la plage (fuseau de l'utilisateur), rappels d'événements à l'échéance (idempotents, première occurrence des récurrents), notification matinale de la question du jour à 9 h locale, enregistrement et suppression d'appareils. Web : cloche avec compteur de non-lus, centre de notifications avec liens profonds, page de réglages. Mobile : demande de permission et enregistrement du jeton Expo après connexion, retrait à la déconnexion.

- **CMS des contenus** (API + admin) : CRUD paginé et filtrable (recherche, statut, offre, langue, jeu, catégorie) pour questions, défis, envies, idées d'activités, catégories et packs ; statut DRAFT / PUBLISHED / ARCHIVED (les brouillons ne sont jamais servis aux joueurs) ; suppression physique des brouillons seulement, archivage sinon ; import JSON en masse avec rapport d'erreurs par index ; écriture réservée au rôle ADMIN, lecture SUPPORT ; journal d'audit sur chaque écriture. Admin : pages « Contenus » par type avec compteurs, filtres, éditeur généré par type, publication/archivage, import.

- **Mobile (Expo)** : écrans des modules MVP — Accueil (question du jour, « On fait quoi ? » en 4 étapes avec ajout à l'agenda, événements à venir, défi du moment), Agenda (30 jours, création avec visibilité et invitation, réponse aux invitations), Jouer (catalogue, lancement, parties en cours), écran de partie (manches, réponses texte/choix/vote, révélation, verdict, résumé), Défis, Intimité & Double Secret, Premium (RevenueCat avec chargement dynamique et repli honnête sans clés ; restauration ; liens de gestion des stores), réglages de notifications, Nous, Plus. Temps réel via Socket.IO. **Non exécuté sur appareil ou simulateur dans cette session** (typecheck + lint uniquement) : une passe de QA sur iOS/Android est indispensable avant toute soumission.

### Fonctions avancées (Phase 4) — en cours
- **Quotidien : listes de courses, tâches, projets** (API + web + mobile) :
  - *Listes de courses* : plusieurs listes par couple, articles avec quantité et rayon, cochage attribué (« Coché par … »), articles cochés en bas de liste, retrait des cochés, archivage / restauration, suppression. Temps réel `shopping.changed` (un article coché apparaît instantanément chez le partenaire, vérifié en e2e).
  - *Tâches* : création avec attribution **volontaire** (moi / partenaire / « on verra »), priorité, échéance, récurrence RRULE (une tâche récurrente terminée recrée l'occurrence suivante), rattachement à un projet, commentaires, filtres À faire / Terminées, notification in-app à l'attribution et au commentaire. **Aucun classement ni score** (règle produit). Temps réel `task.changed`.
  - *Projets* : gabarits (logement, voyage, mariage/union, travaux, arrivée d'un enfant, déménagement, libre) qui pré-remplissent des étapes modifiables, progression calculée sur les étapes, objectif, date cible, budget indicatif, notes partagées, tâches liées (`openTasks`), statuts En cours / Réalisé / Archivé. Temps réel `project.changed`.
  - Isolation stricte par couple (404 hors couple, attribution limitée aux deux membres, projet lié vérifié). Web : page `/quotidien` à onglets + `/projets/[id]` ; composants réutilisables ajoutés au design system (`Checkbox`, `Progress`, `Select`). Mobile : écrans `quotidien` et `projets/[id]`, accès depuis l'accueil et « Plus ».
  - Non livré dans ce jalon : documents de projet (`ProjectDocument`, dépend du stockage S3 du jalon Souvenirs), rappels push sur l'échéance des tâches (à brancher sur la file `reminders`).

- **Mode démo web** : API simulée dans le navigateur (`apps/web/lib/demo`), mêmes DTO que l'API réelle, partenaire simulé, données fictives persistées en local, règles de confidentialité reproduites (réponses cachées avant révélation, envies du partenaire jamais renvoyées, événements privés invisibles). Entrée depuis connexion/inscription, bandeau permanent, réinitialisation et sortie. Zéro appel réseau vérifié en e2e. À masquer en production publique (`NEXT_PUBLIC_DEMO_MODE=off`).

## En cours
- Phase 4, jalon 2 : souvenirs (stockage S3) — pas encore commencé.

## Restant (ordre prévu — voir docs/ROADMAP.md)
11. Phase 4 (suite) : souvenirs (S3, quotas, miniatures), surprises, générateur d'expériences, assistant IA conversationnel « Notre Complice » (personnel / commun, outils), synchronisations calendrier Google / Microsoft / ICS, documents de projet, rappels d'échéance des tâches, QA mobile sur appareil.
12. Phase 5 : site marketing complet (pages fonctionnalités, FAQ, cookies, données structurées), OAuth Apple / Google, 2FA admin, DPIA, tests de charge, runbook, préparation des stores.

## Bugs connus / limitations
- Rappels : seule la première occurrence d'un événement récurrent déclenche un rappel (expansion des occurrences à venir en Phase 4).
- Push : non testé sur appareil réel dans cette session (API Expo simulée dans les tests) ; nécessite un projet EAS (`extra.eas.projectId`) et un build de développement. Quatre bugs trouvés par les tests e2e ont été corrigés (Slot avec `asChild`, effet de vérification annulé par une dépendance instable, code d'invitation perdu après rafraîchissement, redirection post-vérification sur un `/me` périmé).

## Tests exécutés (tous verts)
| Suite | Commande | Résultat |
| --- | --- | --- |
| Unitaires `@couple/shared` | `pnpm --filter @couple/shared test` | 5 tests |
| Unitaires `@couple/validation` | `pnpm --filter @couple/validation test` | 1 test |
| Unitaires `@couple/game-engine` | `pnpm --filter @couple/game-engine test` | 5 tests |
| Unitaires `@couple/ai` | `pnpm --filter @couple/ai test` | 4 tests |
| API (unitaires + intégration sur PostgreSQL réel) | `pnpm --filter @couple/api test` | 69 tests : auth, couples, autorisations, admin, agenda, récurrence, temps réel, jeux, question du jour, défis, intimité, « On fait quoi ? », abonnements, notifications, CMS des contenus, quotidien (listes, tâches, projets) |
| Lint + typecheck (toutes apps/packages) | `pnpm turbo run lint typecheck` | OK |
| Build Next web + admin | `pnpm --filter @couple/web --filter @couple/admin build` | OK |
| E2E Playwright (navigateur réel, API + web production) | `pnpm --filter @couple/web test:e2e` | 12 scénarios (web + admin) : onboarding à deux comptes, refus de connexion, agenda (partagé / occupé / privé / invitation), dilemme à deux + question du jour, défi à deux, Double Secret (activation, confidentialité, révélation mutuelle), « On fait quoi ? » (catalogue → agenda), page Premium sans clés de paiement, notifications (centre, badge, réglages), admin (connexion réservée, création et publication d'une question), quotidien (liste partagée avec propagation temps réel, tâche attribuée puis terminée par le partenaire, projet depuis gabarit avec étape, note et progression vues par les deux), mode démo (parcours complet, API bloquée, zéro requête) |

## Dépendances externes (à fournir)
| Besoin | Variable(s) | Phase |
| --- | --- | --- |
| Fournisseur IA | `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` | 3 (« On fait quoi ? » IA), 4 |
| Stripe (clés test puis prod, webhook) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | 3 |
| RevenueCat (projet, webhook) | `REVENUECAT_WEBHOOK_SECRET` | 3 |
| Stockage S3 compatible | `S3_*` | 4 |
| E-mail transactionnel | `MAIL_PROVIDER=smtp|resend`, `SMTP_URL` ou `RESEND_API_KEY` | avant staging |
| Push Expo | `EXPO_ACCESS_TOKEN`, projet EAS | 3 |
| OAuth Google / Microsoft (calendriers) | à ajouter | 4 |
| Nom de domaine, hébergement UE | — | 5 |

## Déploiement
Voir `docs/DEPLOYMENT.md` : web et admin sur Vercel (deux projets, racines `apps/web` et `apps/admin`), API sur un hébergeur à processus persistant, Postgres et Redis managés en UE. Web déployé en production le 2026-10-25 sur le projet Vercel `app-couple` (https://app-couple-dun.vercel.app, accès protégé par Vercel Authentication). Restent à faire dans le tableau de bord Vercel : variables `NEXT_PUBLIC_API_URL` et `ENABLE_EXPERIMENTAL_COREPACK`, et un second projet (racine `apps/admin`) pour le back-office. L'API n'est pas encore hébergée : inscription et connexion échouent sur le site tant qu'elle ne l'est pas.

## Décisions techniques
Voir `docs/DECISIONS.md` (ADR-001 à ADR-015).

## Prochaines étapes
Voir `NEXT_STEPS.md`.
