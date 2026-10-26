#!/bin/sh
# Exécuté avant chaque mise en ligne (Render `preDeployCommand`, ou à la main dans le conteneur) :
# 1. migrations Prisma ; 2. catalogue de contenu (idempotent) si SEED_ON_DEPLOY=true.
# N'utilise pas pnpm (pas besoin de corepack au runtime) : binaires du paquet @couple/database.
set -eu
DB_DIR="$(cd "$(dirname "$0")/../../../packages/database" && pwd)"
cd "$DB_DIR"
echo "[pre-deploy] migrations Prisma…"
./node_modules/.bin/prisma migrate deploy
if [ "${SEED_ON_DEPLOY:-false}" = "true" ]; then
  echo "[pre-deploy] catalogue de contenu (SEED_ALLOW_PRODUCTION=true : jamais de comptes de démonstration en production)…"
  SEED_ALLOW_PRODUCTION=true ./node_modules/.bin/tsx src/seed/index.ts
fi
echo "[pre-deploy] terminé"
