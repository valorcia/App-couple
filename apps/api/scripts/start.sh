#!/bin/sh
# Démarrage du conteneur : migrations (et catalogue si SEED_ON_DEPLOY=true) puis API.
# Permet les offres sans « pre-deploy command » (plan gratuit Render, VM Docker). MIGRATE_ON_START=false pour désactiver.
set -eu
cd "$(dirname "$0")/.."
if [ "${MIGRATE_ON_START:-true}" = "true" ]; then
  sh scripts/pre-deploy.sh
fi
exec node -r @swc-node/register src/main.ts
