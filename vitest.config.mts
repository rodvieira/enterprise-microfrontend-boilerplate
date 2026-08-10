import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * One runner for the whole workspace (research D4). Packages declare no test
 * config of their own — they inherit this one, the same way they inherit the
 * shared tsconfig and Biome rules. Run a single package with:
 *
 *   pnpm test --project @enterprise-mfe/ui
 *
 * Projects are listed explicitly rather than globbed. A glob-created project
 * does not inherit `environment` or `setupFiles` from this file, which silently
 * leaves every component test without a DOM.
 */
function browserProject(name: string, root: string) {
  return {
    extends: true as const,
    plugins: [react()],
    test: {
      name,
      root,
      environment: 'jsdom' as const,
      setupFiles: ['../../vitest.setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
    },
  };
}

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: '@enterprise-mfe/shared-types',
          root: './packages/shared-types',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'turbo-generators',
          root: './turbo/generators/remote',
          environment: 'node',
          include: ['*.test.ts'],
        },
      },
      browserProject('@enterprise-mfe/ui', './packages/ui'),
      browserProject('@enterprise-mfe/auth', './packages/auth'),
      browserProject('@enterprise-mfe/federation-utils', './packages/federation-utils'),
      browserProject('@enterprise-mfe/event-bus', './packages/event-bus'),
      browserProject('shell', './apps/shell'),
      browserProject('dashboard', './apps/dashboard'),
      browserProject('admin', './apps/admin'),
    ],
  },
});
