import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The source of truth this feature reads live at generation time (research
 * D3) — apps/dashboard was picked because it already declares every
 * singleton scripts/check-shared-deps.ts checks. Never a template literal:
 * see turbo/generators/remote/templates/monorepo/package.json.template.
 */
const SOURCE_MANIFEST = 'apps/dashboard/package.json';

/**
 * Mirrors scripts/check-shared-deps.ts's SINGLETONS exactly. Kept as a
 * separate literal (rather than importing that script, which runs a CLI
 * `main()` on import) — shared-versions.test.ts cross-checks this list
 * against that file's source text so the two can't silently drift apart.
 */
export const REQUIRED_SINGLETONS = [
  'react',
  'react-dom',
  'react-router',
  '@enterprise-mfe/auth',
  '@enterprise-mfe/event-bus',
] as const;

export type SharedVersions = Record<(typeof REQUIRED_SINGLETONS)[number], string>;

/**
 * Every other tool version the templates need that isn't a
 * check-shared-deps.ts singleton — read live for the same reason D3 covers
 * the singletons: a hardcoded literal here would silently drift the next
 * time apps/dashboard bumps one of these, with nothing to catch it until a
 * generated app's build breaks on an unrelated, much later day.
 */
export const REQUIRED_TOOL_VERSIONS = [
  '@module-federation/enhanced',
  '@rspack/cli',
  '@rspack/core',
  '@rspack/dev-server',
  '@tailwindcss/postcss',
  '@testing-library/jest-dom',
  '@testing-library/react',
  '@testing-library/user-event',
  'postcss',
  'postcss-loader',
  'tailwindcss',
  'vitest',
] as const;

export type ToolVersions = Record<(typeof REQUIRED_TOOL_VERSIONS)[number], string>;

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Reads react/react-dom/react-router/@enterprise-mfe/auth/@enterprise-mfe/event-bus
 * version ranges directly from apps/dashboard/package.json. Throws loudly if
 * any of them is missing there, rather than generating a package.json that
 * would silently fail check:shared-deps (research D3).
 */
export function readSharedVersions(repoRoot: string): SharedVersions {
  const manifestPath = join(repoRoot, SOURCE_MANIFEST);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
  const deps = manifest.dependencies ?? {};

  const missing: string[] = [];
  const versions = {} as Record<string, string>;

  for (const name of REQUIRED_SINGLETONS) {
    const range = deps[name];
    if (!range) {
      missing.push(name);
      continue;
    }
    versions[name] = range;
  }

  if (missing.length > 0) {
    throw new Error(
      `shared-versions: ${SOURCE_MANIFEST} is missing required singleton(s): ${missing.join(', ')}. scripts/check-shared-deps.ts's SINGLETONS expects these to be declared there.`,
    );
  }

  return versions as SharedVersions;
}

/**
 * Reads REQUIRED_TOOL_VERSIONS directly from apps/dashboard/package.json's
 * dependencies and devDependencies (merged — @module-federation/enhanced is
 * a runtime dependency there, the rest are dev tooling). Same live-read
 * discipline as readSharedVersions, for the same reason.
 */
export function readToolVersions(repoRoot: string): ToolVersions {
  const manifestPath = join(repoRoot, SOURCE_MANIFEST);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
  const merged = { ...manifest.dependencies, ...manifest.devDependencies };

  const missing: string[] = [];
  const versions = {} as Record<string, string>;

  for (const name of REQUIRED_TOOL_VERSIONS) {
    const range = merged[name];
    if (!range) {
      missing.push(name);
      continue;
    }
    versions[name] = range;
  }

  if (missing.length > 0) {
    throw new Error(
      `shared-versions: ${SOURCE_MANIFEST} is missing expected tool version(s): ${missing.join(', ')}.`,
    );
  }

  return versions as ToolVersions;
}
