import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * One runner for the whole workspace (research D4). Packages declare no test
 * config of their own — they inherit this one, the same way they inherit the
 * shared tsconfig and Biome rules. Run a single package with:
 *
 *   pnpm test --project @enterprise-mfe/ui
 */
export default defineConfig({
  plugins: [react()],
  test: {
    projects: ['packages/*'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // config-typescript and config-biome ship configuration, not code, so they
    // have no tests. A package without tests is not a failure.
    passWithNoTests: true,
  },
});
