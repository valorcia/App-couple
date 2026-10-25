# Entre Nous — le compagnon intelligent du couple

> Nom provisoire. S'AIMER — S'AMUSER — CONSTRUIRE ENSEMBLE.

Application SaaS B2C (web + iOS + Android) qui accompagne les couples dans leur
quotidien, leur relation et leurs loisirs : agenda partagé intelligent, organisation
du quotidien, jeux de couple, défis, intimité consentie (« Double Secret »),
surprises, souvenirs et assistant IA.

## Documentation

| Document | Contenu |
| --- | --- |
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | Vision, personas, parcours utilisateurs, périmètre MVP, règles métier |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique, monorepo, flux, intégrations, performance |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Modèle relationnel, règles d'isolation, index, politique de suppression |
| [docs/SECURITY.md](docs/SECURITY.md) | Modèle de menaces, authentification, RGPD, données sensibles |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Direction artistique, tokens, composants, mode sombre |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases, jalons, critères de sortie |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Registre des décisions techniques (ADR) et arbitrages en attente |
| [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) | État d'avancement, bugs connus, tests, dépendances externes |
| [NEXT_STEPS.md](NEXT_STEPS.md) | Reprise du développement dans une nouvelle session |

## Structure du monorepo

```
apps/
  api/      NestJS — API REST (OpenAPI) + WebSockets
  web/      Next.js — application web + site marketing
  admin/    Next.js — back-office administrateur (déploiement séparé)
  mobile/   Expo / React Native — iOS & Android
packages/
  database/     Prisma schema, migrations, client, seed
  validation/   Schémas zod partagés (API ⇄ web ⇄ mobile)
  types/        Types TypeScript partagés (DTO, enums)
  config/       Configurations partagées (eslint, tsconfig, env)
  ui/           Design system (tokens CSS, composants React web)
  game-engine/  Moteur des jeux (états, règles, révélation, matching)
  ai/           Fournisseur IA configurable, prompts, validation JSON
  shared/       Utilitaires (dates, i18n, erreurs, constantes)
```

## Démarrage rapide

Prérequis : Node 22, pnpm 10, PostgreSQL 16, Redis 7.

```bash
pnpm install
cp .env.example .env            # puis renseigner les variables
pnpm db:migrate                 # applique les migrations Prisma
pnpm db:seed                    # catalogue de démonstration (hors production)
pnpm dev                        # api :4000, web :3000, admin :3100
```

Tests :

```bash
pnpm test                       # unitaires + intégration (base appcouple_test)
pnpm lint && pnpm typecheck
```

Aucune clé API n'est versionnée. Voir `.env.example` pour la liste des variables.
