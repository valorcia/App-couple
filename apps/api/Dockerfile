# syntax=docker/dockerfile:1.7
# Image API / worker (même image, rôle choisi par WORKER_MODE).
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY packages/types/package.json packages/types/
COPY packages/validation/package.json packages/validation/
COPY packages/database/package.json packages/database/
RUN pnpm install --frozen-lockfile --filter @couple/api... --prod=false

FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
COPY tsconfig.base.json ./
RUN pnpm --filter @couple/database generate

FROM build AS runtime
ENV NODE_ENV=production
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:4000/health/live || exit 1
WORKDIR /app/apps/api
# Exécution via @swc-node/register (voir docs/ARCHITECTURE.md §3). scripts/start.sh applique les migrations
# au démarrage (MIGRATE_ON_START=false pour les lancer séparément : pnpm --filter @couple/database migrate:deploy).
CMD ["sh", "scripts/start.sh"]
