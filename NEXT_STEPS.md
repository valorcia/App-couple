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

## 3. Prochaine tâche : Phase 4 — fonctions avancées (jalon 1 livré)
Ordre conseillé (chaque jalon = API + tests + web, mobile ensuite) :
1. ~~Listes de courses & tâches~~ et ~~Projets~~ : **livrés** (`apps/api/src/modules/daily-life`, `apps/api/src/modules/projects`, web `components/daily-life`, mobile `app/quotidien.tsx`). Reste : documents de projet (après S3) et rappels push d'échéance des tâches (file `reminders`, même mécanisme que les événements).
2. **Souvenirs** : stockage S3 (URL présignées, quotas `quota.*.storageBytes`, traitement asynchrone des miniatures via BullMQ `media`, strip EXIF), albums, frise, recherche, export ; quiz « Nos souvenirs » (MEMORY_QUIZ) à partir des souvenirs marqués `aiAllowed`. Brancher ensuite `ProjectDocument`.
3. **Surprises** (`Surprise` + événement agenda SURPRISE au titre masqué, `detailsEnc` chiffré) : flux date → budget → ambiance → idées → créneau → invitation mystérieuse, indices programmés, compte à rebours, révélation.
4. **Générateur d'expériences** : étendre `IdeasService` + `packages/ai` (schémas de sortie soirée romantique / humoristique / week-end / intime), historique `Experience`, exclusion des activités déjà réalisées.
5. **Assistant « Notre Complice »** : `AIConversation` / `AIMessage` (contenu chiffré), modes personnel / commun, outils (disponibilités via `CalendarService.freeSlots`, proposition d'événement avec validation explicite, création de tâche via `DailyLifeService.createTask`), quotas, jamais d'écriture partagée sans confirmation.
6. **Synchronisations calendrier** : OAuth Google / Microsoft (`CalendarConnection`, jetons chiffrés), sync incrémentale bidirectionnelle, dédoublonnage `iCalUid`, import/export ICS, flux ICS en lecture pour Apple.
7. **QA mobile réelle** (bloquant avant stores) : lancer `apps/mobile` sur simulateur iOS et émulateur Android (`pnpm --filter @couple/mobile dev`), corriger les écarts, remplir `extra.eas.projectId` et les clés RevenueCat. À faire dès qu'un poste avec Xcode / Android Studio est disponible ; aucun écran mobile n'a encore été exécuté.

## 4. Conventions à respecter
- Jamais d'entité Prisma brute en sortie d'API : mapper vers un DTO explicite.
- `coupleId` toujours issu de `@CurrentCouple()`, jamais d'un paramètre client.
- Tout texte UI dans `apps/web/messages/fr.json` (web) ; mobile : `@couple/shared/i18n/fr` en attendant l'i18n complète.
- Chaque module : service + contrôleur + schémas zod + tests d'intégration (`apps/api/test/*.spec.ts`, base réelle) + mise à jour de `DEVELOPMENT_STATUS.md`.
- Ne jamais présenter un bouton inactif comme une fonctionnalité livrée : badge « Bientôt disponible » tant que ce n'est pas branché.
