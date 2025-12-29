import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright CI Configuration - Optimized for Fast Feedback
 *
 * Single browser (chromium), no retries, parallel workers.
 * For full cross-browser testing, use: npm run test:e2e:full
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  // Fail fast - no retries for quick CI feedback
  retries: 0,

  // Parallel workers in CI for speed
  workers: process.env.CI ? 2 : undefined,

  reporter: [['html'], ['list']],

  // Reduced timeout for faster failure detection
  timeout: 20000,

  use: {
    baseURL: 'http://localhost:5173',

    // Action timeout for individual operations (increased for CI stability)
    actionTimeout: 15000,

    // Artifacts only on failure (no retries means on-first-retry won't trigger)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project for authentication
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // CI: Only chromium for fast feedback
    // For full browser testing, use playwright.config.full.ts
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'cd ../backend && uvicorn app.main:app --host 0.0.0.0 --port 8000',
      url: 'http://localhost:8000/health',
      // CI pre-starts servers, so always allow reuse
      reuseExistingServer: true,
      timeout: 60 * 1000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      // CI pre-starts servers, so always allow reuse
      reuseExistingServer: true,
      timeout: 30 * 1000,
    },
  ],
});
