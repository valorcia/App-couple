import { defineConfig, devices } from '@playwright/test';

/** Captures de design en mode démo : seul le site web est démarré (aucune API). */
const WEB_PORT = 3250;
export default defineConfig({
  testDir: './e2e/design',
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${WEB_PORT}`, locale: 'fr-FR', ...devices['Desktop Chrome'] },
  webServer: {
    command: process.env.DESIGN_DEV ? `pnpm exec next dev -p ${WEB_PORT}` : `NEXT_TELEMETRY_DISABLED=1 pnpm exec next build && pnpm exec next start -p ${WEB_PORT}`,
    url: `http://localhost:${WEB_PORT}/`,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
