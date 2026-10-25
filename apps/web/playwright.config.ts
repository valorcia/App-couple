import { defineConfig, devices } from '@playwright/test';

const API_PORT = 4100;
const WEB_PORT = 3200;
const ADMIN_PORT = 3300;

export default defineConfig({
  testDir: './e2e',
  // Par défaut, les e2e tournent sur un build de production (déterministe). E2E_DEV=1 utilise le serveur de dev.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'fr-FR',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: `API_PORT=${API_PORT} API_PUBLIC_URL=http://localhost:${API_PORT} WEB_PUBLIC_URL=http://localhost:${WEB_PORT} CORS_ORIGINS=http://localhost:${WEB_PORT},http://localhost:${ADMIN_PORT} ADMIN_PUBLIC_URL=http://localhost:${ADMIN_PORT} MAIL_PROVIDER=console RATE_LIMIT_DISABLED=true REDIS_URL=redis://127.0.0.1:6379/3 LOG_LEVEL=warn node -r @swc-node/register -r dotenv/config src/main.ts dotenv_config_path=../../.env`,
      cwd: '../api',
      url: `http://localhost:${API_PORT}/health/live`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: process.env.E2E_DEV
        ? `NEXT_PUBLIC_API_URL=http://localhost:${API_PORT} pnpm exec next dev -p ${WEB_PORT}`
        : `NEXT_PUBLIC_API_URL=http://localhost:${API_PORT} NEXT_TELEMETRY_DISABLED=1 pnpm exec next build && pnpm exec next start -p ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}/`,
      reuseExistingServer: false,
      timeout: 300_000,
    },
    {
      command: `NEXT_PUBLIC_API_URL=http://localhost:${API_PORT} NEXT_TELEMETRY_DISABLED=1 pnpm --filter @couple/admin exec next build && pnpm --filter @couple/admin exec next start -p ${ADMIN_PORT}`,
      url: `http://localhost:${ADMIN_PORT}/connexion`,
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
