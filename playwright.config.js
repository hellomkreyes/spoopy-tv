import { defineConfig, devices } from '@playwright/test';

// Tests run against the production build so the CSP <meta> tag is in force.
export default defineConfig({
  testDir: 'tests',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:4173', timezoneId: 'America/Toronto' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
