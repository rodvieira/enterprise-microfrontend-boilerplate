import { defineConfig } from '@playwright/test';

/**
 * End-to-end coverage of the thing unit tests cannot reach: the shell
 * composing real remotes across a real network boundary.
 *
 * All three dev servers are started from the repository root so pnpm's
 * workspace filtering resolves correctly regardless of the shell where this
 * runs from.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Relative to apps/shell, matching turbo.json's e2e task output glob
  // ("playwright-report/**", resolved per-package like every other task).
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'pnpm --filter @enterprise-mfe/shell dev',
      url: 'http://localhost:3000',
      cwd: '../..',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @enterprise-mfe/dashboard dev',
      url: 'http://localhost:3001',
      cwd: '../..',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @enterprise-mfe/admin dev',
      url: 'http://localhost:3002',
      cwd: '../..',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
