import { defineConfig, devices } from '@playwright/test';

// Story tests run their own mock servers on separate ports, so they never
// collide with (or talk to) a game you have running with real characters.
const WEB_PORT = 5273;
const API_PORT = 8887;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // PW_CHANNEL=chrome runs the tests in an installed Google Chrome (with a
        // throwaway profile) when Playwright's own Chromium is not installed.
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
      },
    },
  ],
  webServer: {
    command: `npx cross-env WEB_PORT=${WEB_PORT} API_PORT=${API_PORT} npm run dev:mock`,
    url: `http://localhost:${WEB_PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
