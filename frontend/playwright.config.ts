import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite (Plan §22). Runs a hermetic stack: its own API on :4100 against the
 * `rupeeflow_test` database and its own Vite server on :5174 proxying to it, so it never
 * touches development data. Locally it drives the installed Chrome; CI installs Chromium.
 */
const API_PORT = 4100;
const WEB_PORT = 5174;
const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://rupeeflow:rupeeflow@localhost:5433/rupeeflow_test?schema=public';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  reporter: process.env.CI ? 'github' : [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    acceptDownloads: true,
    channel: process.env.CI ? undefined : 'chrome',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, grepInvert: /@mobile-only/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: 'npm --prefix ../backend run dev',
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL: TEST_DB,
        NODE_ENV: 'development',
        FRONTEND_ORIGIN: `http://localhost:${WEB_PORT}`,
        AUTH_RATE_LIMIT_MAX: '10000',
        LOG_REQUESTS: 'false',
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}`, VITE_API_URL: '/api' },
    },
  ],
});
