# Déploiement

## 1. Vue d'ensemble

| Composant | Hébergement recommandé | Pourquoi |
| --- | --- | --- |
| `apps/web` (Next.js) | **Vercel** | Rendu Next.js natif, CDN, previews par branche. |
| `apps/admin` (Next.js) | **Vercel** (projet séparé) | Même chose ; protéger l'URL (Vercel Authentication ou IP de confiance). |
| `apps/api` (NestJS) | Serveur persistant : **Render** (blueprint `render.yaml` fourni, §4 bis), Railway, Fly.io, Scaleway Containers, ou VM Docker | WebSockets Socket.IO, workers BullMQ, planificateur et connexions Redis longues : incompatibles avec un hébergement serverless. |
| PostgreSQL 16 | Managé en UE (Neon, Supabase, Scaleway, OVH) | Données personnelles : rester en Union européenne (RGPD). |
| Redis 7 | Managé (Upstash, Redis Cloud, Scaleway) | Rate limiting, cache, files BullMQ, adaptateur Socket.IO. |
| Stockage objet | S3 compatible (Cloudflare R2, Scaleway) | Souvenirs, documents (Phase 4). |

L'API expose `Dockerfile` dans `apps/api` ; `docker-compose.yml` à la racine décrit l'environnement de développement.

## 2. Vercel — `apps/web`

**État au 2026-10-25** : projet Vercel `app-couple` (équipe « loicchristina-2381's projects ») lié à `valorcia/App-couple`, racine `apps/web`, production sur `master`. Premier déploiement réussi : https://app-couple-dun.vercel.app (protégé par Vercel Authentication tant qu'aucun domaine personnalisé n'est attaché). Variables d'environnement **non encore renseignées** (le connecteur n'a pas le droit de les écrire) : à saisir dans le tableau de bord, puis redéployer.

Créer le projet depuis le tableau de bord Vercel (**Add New → Project → Import** `valorcia/App-couple`) avec ces réglages :

| Réglage | Valeur |
| --- | --- |
| Project name | `entre-nous-web` |
| Framework preset | Next.js |
| Root directory | `apps/web` (laisser « Include source files outside of the Root Directory » activé) |
| Build command | `next build` (défaut) |
| Install command | défaut (`pnpm install`, détecté via `pnpm-lock.yaml` à la racine) |
| Node.js version | 22.x |
| Production branch | `master` |

Variables d'environnement (Production et Preview) :

| Variable | Valeur | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | URL publique de l'API (ex. `https://api.<domaine>`) | Inlinée au build : tout changement impose un redéploiement. |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | Fait respecter `packageManager: pnpm@10.28.0` du `package.json` racine. |

Tant que l'API n'est pas hébergée, le site marketing fonctionne mais l'inscription et la connexion échoueront (le client affiche une erreur réseau explicite). Ne pas publier l'URL avant que l'API réponde sur `/health/ready`.

## 3. Vercel — `apps/admin`

Même procédure, projet `entre-nous-admin`, Root directory `apps/admin`, mêmes variables. Activer **Deployment Protection → Vercel Authentication** sur toutes les cibles (ou Trusted IPs) : le back-office ne doit pas être atteignable publiquement, même s'il exige déjà un compte ADMIN/SUPPORT.

## 4. API — variables d'environnement

Reprendre `.env.example`. Minimum pour un staging :

```
NODE_ENV=production
API_PORT=4000
API_PUBLIC_URL=https://api.<domaine>
WEB_PUBLIC_URL=https://<domaine>
ADMIN_PUBLIC_URL=https://admin.<domaine>
CORS_ORIGINS=https://<domaine>,https://admin.<domaine>
DATABASE_URL=postgresql://…            # Postgres managé UE
REDIS_URL=rediss://…                   # Redis managé
JWT_SECRET=<openssl rand -base64 48>
DATA_ENCRYPTION_KEY=<openssl rand -base64 32>   # doit décoder 32 octets
MAIL_PROVIDER=resend|smtp + RESEND_API_KEY ou SMTP_URL
WORKERS_INLINE=true                    # ou un second conteneur avec WORKER_MODE=true
```

Puis, une seule fois par environnement : `pnpm db:migrate` (migrations Prisma) et, en staging seulement, `pnpm db:seed`.

Clés optionnelles, à ajouter quand les comptes existent : `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL`, `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (webhook `POST /billing/webhooks/stripe`), `REVENUECAT_WEBHOOK_SECRET` (webhook `POST /billing/webhooks/revenuecat`), `EXPO_ACCESS_TOKEN`, `S3_*`. Aucune clé n'est jamais commitée.

### 4 bis. API sur Render en un clic (blueprint `render.yaml`)

Le dépôt contient un blueprint Render qui crée l'API (Docker, Francfort, plan Starter), un Postgres 16 et un Redis (« Key Value », politique `noeviction` pour BullMQ) :

1. Render → **New → Blueprint** → connecter GitHub → choisir `valorcia/App-couple` (branche `master`).
2. Renseigner les variables demandées : `API_PUBLIC_URL`, `WEB_PUBLIC_URL`, `ADMIN_PUBLIC_URL`, `CORS_ORIGINS`, `MAIL_FROM`, `RESEND_API_KEY`, `ADMIN_BOOTSTRAP_EMAILS` (votre adresse : le compte est promu ADMIN au démarrage une fois créé dans l'app). `JWT_SECRET` et `DATA_ENCRYPTION_KEY` sont générés par Render (la clé de chiffrement est dérivée en 32 octets au démarrage).
3. **Apply** : à chaque mise en ligne, `apps/api/scripts/pre-deploy.sh` applique les migrations puis, tant que `SEED_ON_DEPLOY=true`, le catalogue de contenu (jamais de comptes de démonstration en production). Passer `SEED_ON_DEPLOY` à `false` après la première mise en ligne pour que les modifications faites dans l'admin ne soient pas réécrites.
4. Vérifier `https://<api>/health/ready` → 200, puis pointer `NEXT_PUBLIC_API_URL` du projet Vercel web sur cette URL et redéployer.
5. Domaine : ajouter `api.<domaine>` dans Render (Settings → Custom Domains) et `app.<domaine>` sur Vercel. **Indispensable** pour que le cookie de session soit conservé (§5) : `*.vercel.app` + `*.onrender.com` sont deux sites différents.

Coût indicatif : Starter 7 $/mois + Postgres Basic ≈ 6 $/mois ; Redis gratuit au départ.

## 5. Cookies et domaines

Le refresh token web est un cookie `httpOnly` `SameSite=Lax` posé par l'API. Web et API doivent partager le même site (ex. `entre-nous.fr` et `api.entre-nous.fr`) ; en preview Vercel (`*.vercel.app`) contre une API sur un autre domaine, le cookie n'est pas conservé entre sites et il faut pointer `NEXT_PUBLIC_API_URL` vers une API de staging sur un sous-domaine du même site.

## 6. Mode démo (web)

Le site web embarque un **mode démo** : depuis la page de connexion ou d'inscription, « Explorer la démo » charge l'application avec une API simulée dans le navigateur (`apps/web/lib/demo`), des données fictives stockées en `localStorage` et un partenaire simulé (« Camille »). Aucun appel réseau n'est émis en démo (vérifié par le scénario Playwright `e2e/demo.spec.ts`, qui bloque l'API). Un bandeau permanent le signale, avec « Réinitialiser » et « Quitter la démo ».

Il sert à tester l'interface sans serveur. **Avant l'ouverture publique**, le masquer avec la variable d'environnement `NEXT_PUBLIC_DEMO_MODE=off` (Production) puis redéployer.

## 7. Checklist avant production
- [ ] `NEXT_PUBLIC_DEMO_MODE=off` sur le projet web Vercel (production).

- [ ] `pnpm turbo run lint typecheck test` et e2e verts sur `master` (CI GitHub Actions).
- [ ] Migrations appliquées, `GET /health/ready` répond 200.
- [ ] `RATE_LIMIT_DISABLED` absent (refusé en production).
- [ ] Secrets générés spécifiquement pour la production (jamais ceux du staging).
- [ ] Pages légales (CGU, confidentialité, cookies) finalisées (encore des gabarits).
- [ ] Sauvegardes Postgres activées, rétention définie.
