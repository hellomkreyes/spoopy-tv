import { defineConfig, devices } from '@playwright/test';

// Tests run against the production build so the CSP <meta> tag is in force.
export default defineConfig({
  testDir: 'tests',
  // One retry in CI so a single flaky run doesn't fail the check; real bugs fail twice.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:4173', timezoneId: 'America/Toronto' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
