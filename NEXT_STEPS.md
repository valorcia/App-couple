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

## 3. Prochaine tâche : Phase 3, jalon 7 — Abonnements & entitlements
- `apps/api/src/modules/billing/` : `GET /billing/products` (produits actifs), `POST /billing/checkout` (Stripe Checkout Session, mode subscription, `client_reference_id = coupleId`, URL succès/annulation web), `POST /billing/portal` (Stripe Billing Portal), `POST /webhooks/stripe` (signature vérifiée, idempotence `WebhookEvent`, `checkout.session.completed`, `customer.subscription.updated|deleted`, `invoice.payment_failed` → `Subscription` + `Entitlement` du couple), `POST /webhooks/revenuecat` (signature, `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION` → idem), `GET /billing/status`.
- Règles : un abonnement couvre le couple ; le body brut de la requête Stripe est nécessaire pour la signature (middleware `raw` sur la route) ; jamais de paiement simulé ; en l'absence de clés, `/billing/checkout` répond 503 `BILLING_UNAVAILABLE` et le web affiche l'état « paiement non configuré ».
- Web : page `/premium` (offres depuis `/billing/products`, bouton Stripe), paywall contextuel (composant `PaywallCard` déclenché par les erreurs 402 `ENTITLEMENT_REQUIRED` / `QUOTA_EXCEEDED`), gestion de l'abonnement dans Profil.
- Admin : vue abonnements (table `Subscription`), MRR simple.
- Tests : webhooks signés (clé de test), idempotence, mise à jour des entitlements, expiration.

Puis jalon 8 (push Expo + préférences + heures silencieuses), jalon 9 (CMS admin), jalon 10 (mobile).

## 4. Conventions à respecter
- Jamais d'entité Prisma brute en sortie d'API : mapper vers un DTO explicite.
- `coupleId` toujours issu de `@CurrentCouple()`, jamais d'un paramètre client.
- Tout texte UI dans `apps/web/messages/fr.json` (web) ; mobile : `@couple/shared/i18n/fr` en attendant l'i18n complète.
- Chaque module : service + contrôleur + schémas zod + tests d'intégration (`apps/api/test/*.spec.ts`, base réelle) + mise à jour de `DEVELOPMENT_STATUS.md`.
- Ne jamais présenter un bouton inactif comme une fonctionnalité livrée : badge « Bientôt disponible » tant que ce n'est pas branché.
