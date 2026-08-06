import { defineConfig } from '@playwright/test';

/**
 * The first real end-to-end config in this project (research D6,
 * 003-dashboard-remote) — deferred by 002-shell-host's research D7 until a
 * real remote existed to compose across a real network boundary.
 *
 * Both dev servers are started from the repository root so pnpm's workspace
 * filtering resolves correctly regardless of the shell where this runs from.
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
  ],
});
