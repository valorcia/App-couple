# DEVELOPMENT_STATUS

Dernière mise à jour : 2026-10-25 — Phase 1 terminée, **Phase 2 (socle technique) terminée**, Phase 3 à démarrer.

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

## En cours
- Rien (fin de phase).

## Restant (ordre prévu — voir docs/ROADMAP.md)
1. Agenda partagé (CRUD, visibilité Privé/Partagé/Occupé, récurrence, rappels, invitations) + temps réel.
2. Moteur de jeux + Réponses secrètes + question du jour.
3. Dilemmes, Lequel de nous deux, Qui connaît le mieux.
4. Défis.
5. Double Secret (consentement, intersection serveur, révélation mutuelle).
6. « On fait quoi ? » (catalogue → agenda ; IA ensuite).
7. Abonnements (Stripe web, RevenueCat mobile) + quotas gratuits.
8. Notifications (préférences, heures silencieuses, push Expo).
9. CMS admin des contenus.
10. Écrans mobiles des modules ci-dessus.
11. Phase 4 : assistant IA, surprises, expériences, projets, listes & tâches, souvenirs, synchronisations calendrier.
12. Phase 5 : site marketing complet, OAuth Apple/Google, 2FA admin, DPIA, charge, stores.

## Bugs connus
- Aucun bug ouvert. Trois bugs trouvés par le test e2e ont été corrigés (Slot avec `asChild`, effet de vérification annulé par une dépendance instable, code d'invitation perdu après rafraîchissement).

## Tests exécutés (tous verts)
| Suite | Commande | Résultat |
| --- | --- | --- |
| Unitaires `@couple/shared` | `pnpm --filter @couple/shared test` | 5 tests |
| Unitaires `@couple/validation` | `pnpm --filter @couple/validation test` | 1 test |
| API (unitaires + intégration sur PostgreSQL réel) | `pnpm --filter @couple/api test` | 22 tests : auth, couples, autorisations, admin |
| Lint + typecheck (toutes apps/packages) | `pnpm turbo run lint typecheck` | OK |
| Build Next web + admin | `pnpm --filter @couple/web --filter @couple/admin build` | OK |
| E2E Playwright (navigateur réel, API + web production) | `pnpm --filter @couple/web test:e2e` | 2 scénarios : onboarding complet à deux comptes, refus de connexion |

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

## Décisions techniques
Voir `docs/DECISIONS.md` (ADR-001 à ADR-015).

## Prochaines étapes
Voir `NEXT_STEPS.md`.
