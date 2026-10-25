# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY packages/types/package.json packages/types/
COPY packages/validation/package.json packages/validation/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter @couple/web...

FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_TELEMETRY_DISABLED=1
COPY packages ./packages
COPY apps/web ./apps/web
COPY tsconfig.base.json ./
RUN pnpm --filter @couple/web build

FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
USER node
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["pnpm", "exec", "next", "start", "-p", "3000"]
