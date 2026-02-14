import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const port = process.env.PLAYWRIGHT_PORT ?? (isCI ? '4173' : '5173');
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: isCI
      ? `pnpm exec vite preview --host ${host} --port ${port}`
      : `pnpm exec vite --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
  },
});
