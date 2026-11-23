/**
 * Playwright (FND-001). `npm run test:e2e` compila si hace falta (tests/e2e/ensure-build.mjs),
 * arranca mock-api (:4010) y server/server.js (:3100) con BACKEND_URL apuntando al mock.
 * E2E_LIVE=1 usa el BACKEND_URL de .env (backend real, cuenta de pruebas).
 */
import { defineConfig, devices } from '@playwright/test';

const live = process.env.E2E_LIVE === '1';
const MOCK_PORT = 4010;
const WEB_PORT = Number(process.env.E2E_PORT) || 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /.*\.e2e\.mjs$/,
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['junit', { outputFile: 'reports/junit-e2e.xml' }], ['html', { outputFolder: 'reports/e2e-html', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-CO',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    ...(live ? [] : [{ command: 'node tests/mock-api/server.mjs', port: MOCK_PORT, reuseExistingServer: !process.env.CI, env: { MOCK_PORT: String(MOCK_PORT) } }]),
    {
      command: live ? 'node --env-file-if-exists=.env server/server.js' : 'node server/server.js',
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      env: { PORT: String(WEB_PORT), ...(live ? {} : { BACKEND_URL: `http://127.0.0.1:${MOCK_PORT}`, BACKEND_TIMEOUT_MS: '5000' }) },
    },
  ],
});
