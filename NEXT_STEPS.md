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

## 3. Prochaine tâche : Phase 3, jalon 8 — Notifications push et préférences
- API : `PUT /notifications/preferences` (par catégorie : push/inApp/email, heures silencieuses, max par jour), `POST /push/devices` (enregistrement du jeton Expo, plateforme) et suppression ; `PushService` (Expo Push API, lots de 100, gestion des reçus et des jetons invalides) ; application des préférences et des heures silencieuses dans `NotificationsService.notify` (report après la fenêtre silencieuse via BullMQ `notifications` avec délai).
- Worker BullMQ (`WORKER_MODE=true`) : file `reminders` (rappels d'événements : scan des `EventReminder` à échéance, idempotence `sentAt`), file `push`, planification de la question du jour (notification matinale selon fuseau et préférences).
- Web : page Réglages → Notifications (préférences par catégorie, heures silencieuses), centre de notifications (cloche, liste, lecture).
- Mobile : enregistrement du jeton (`expo-notifications`) après connexion.
- Tests : préférences respectées, heures silencieuses, idempotence des rappels, jetons invalides retirés.

Puis jalon 9 (CMS admin des contenus), jalon 10 (écrans mobiles des modules MVP).

## 4. Conventions à respecter
- Jamais d'entité Prisma brute en sortie d'API : mapper vers un DTO explicite.
- `coupleId` toujours issu de `@CurrentCouple()`, jamais d'un paramètre client.
- Tout texte UI dans `apps/web/messages/fr.json` (web) ; mobile : `@couple/shared/i18n/fr` en attendant l'i18n complète.
- Chaque module : service + contrôleur + schémas zod + tests d'intégration (`apps/api/test/*.spec.ts`, base réelle) + mise à jour de `DEVELOPMENT_STATUS.md`.
- Ne jamais présenter un bouton inactif comme une fonctionnalité livrée : badge « Bientôt disponible » tant que ce n'est pas branché.
