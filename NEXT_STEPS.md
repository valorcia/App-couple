# NEXT_STEPS — reprise du développement

## 1. Remettre l'environnement en route (5 min)
```bash
# Services (ou PostgreSQL 16 + Redis 7 locaux)
docker compose up -d postgres redis
pnpm install
cp .env.example .env   # renseigner JWT_SECRET (openssl rand -base64 48) et DATA_ENCRYPTION_KEY (openssl rand -base64 32)
pnpm db:migrate        # base appcouple
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/appcouple_test pnpm db:migrate   # base de test
pnpm db:seed           # catalogue + comptes démo (alex@/camille@/admin@demo.local, mot de passe Demo!EntreNous2026)
pnpm dev               # api :4000 (docs sur /docs), web :3000, admin :3100
pnpm test              # tout doit être vert avant de commencer
```

## 2. Lire
1. `DEVELOPMENT_STATUS.md` (où on en est).
2. `docs/DECISIONS.md` section A : arbitrages A1–A6. S'ils ont reçu une réponse du propriétaire, les appliquer d'abord.
3. `docs/ARCHITECTURE.md` §4 (conventions API : guards, DTO de sortie, projections de confidentialité).

## 3. Prochaine tâche : Phase 3, jalon 9 — CMS admin des contenus
- API `apps/api/src/modules/admin/content/` (rôles ADMIN/SUPPORT ; écriture ADMIN) : CRUD paginé + recherche pour `Question`, `Challenge`, `DesireItem`, `ActivityIdea`, `ContentCategory`, `ContentPack`, `Mission` ; statut DRAFT/PUBLISHED/ARCHIVED ; import CSV/JSON en masse ; export ; journal d'audit sur chaque écriture ; traductions (`Translation`) pour les futures locales.
- Admin Next : pages « Contenus » avec onglets par type, filtres (type de jeu, catégorie, tier, statut, locale), formulaire d'édition (texte, options de dilemme, niveau, tier, pack), actions publier/archiver, import.
- Tests : autorisations (SUPPORT lecture seule), validation, import idempotent, contenu DRAFT invisible côté joueur.

Puis jalon 10 (écrans mobiles : agenda, jeux, défis, question du jour, Premium via RevenueCat), puis Phase 4.

## 4. Conventions à respecter
- Jamais d'entité Prisma brute en sortie d'API : mapper vers un DTO explicite.
- `coupleId` toujours issu de `@CurrentCouple()`, jamais d'un paramètre client.
- Tout texte UI dans `apps/web/messages/fr.json` (web) ; mobile : `@couple/shared/i18n/fr` en attendant l'i18n complète.
- Chaque module : service + contrôleur + schémas zod + tests d'intégration (`apps/api/test/*.spec.ts`, base réelle) + mise à jour de `DEVELOPMENT_STATUS.md`.
- Ne jamais présenter un bouton inactif comme une fonctionnalité livrée : badge « Bientôt disponible » tant que ce n'est pas branché.
