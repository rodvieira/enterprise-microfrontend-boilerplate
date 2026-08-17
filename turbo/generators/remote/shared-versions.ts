import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The generator reads every version live at generation time
 * from a real remote's manifest — never a template literal, see
 * turbo/generators/remote/templates/monorepo/package.json.template.
 *
 * *Which* remote is discovered rather than hardcoded. It used to be
 * literally `apps/dashboard/package.json`, which made the generator break
 * outright the moment the example remotes were removed — exactly what
 * `pnpm eject` does for a company adopting this boilerplate. Any remote
 * declaring the full singleton set is an equally valid source, so the
 * generator asks for one instead of naming one.
 */
const APPS_DIR = 'apps';

/** The host is not a remote: it does not declare the full singleton set. */
const NOT_A_REMOTE: readonly string[] = ['shell'];

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
 * check-shared-deps.ts singleton — read live for the same reason the
 * singletons are: a hardcoded literal here would silently drift the next
 * time the source remote bumps one of these, with nothing to catch it until a
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

function candidateAppDirs(repoRoot: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(join(repoRoot, APPS_DIR), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
  // Sorted so the same checkout always resolves the same manifest — an
  // arbitrary readdir order would make a generated app's versions depend on
  // filesystem iteration order.
  return entries.filter((name) => !NOT_A_REMOTE.includes(name)).sort();
}

/**
 * The first remote under apps/ that declares every REQUIRED_SINGLETONS
 * entry, as a repo-relative manifest path.
 *
 * Throws naming each candidate and exactly what it is missing, rather than
 * a bare "no source found" — when this fails, the useful question is always
 * "which singleton did that remote forget to declare?".
 */
export function resolveSourceManifest(repoRoot: string): string {
  const candidates = candidateAppDirs(repoRoot);
  const rejected: string[] = [];

  for (const name of candidates) {
    const manifestPath = join(APPS_DIR, name, 'package.json');
    let manifest: PackageManifest;
    try {
      manifest = JSON.parse(readFileSync(join(repoRoot, manifestPath), 'utf8')) as PackageManifest;
    } catch {
      rejected.push(`${manifestPath} (no readable package.json)`);
      continue;
    }
    const deps = manifest.dependencies ?? {};
    const missing = REQUIRED_SINGLETONS.filter((singleton) => !deps[singleton]);
    if (missing.length === 0) {
      return manifestPath;
    }
    rejected.push(`${manifestPath} (missing: ${missing.join(', ')})`);
  }

  const detail =
    rejected.length > 0
      ? `Checked:\n  - ${rejected.join('\n  - ')}`
      : `No app other than ${NOT_A_REMOTE.join('/')} exists under ${APPS_DIR}/.`;

  throw new Error(
    `shared-versions: no remote under ${APPS_DIR}/ declares every required singleton ` +
      `(${REQUIRED_SINGLETONS.join(', ')}), so there is nothing to read generated versions from.\n${detail}`,
  );
}

/**
 * Reads every REQUIRED_SINGLETONS range from the discovered source manifest
 * (resolveSourceManifest). Throws loudly when no remote declares them all,
 * rather than generating a package.json that would silently fail
 * check:shared-deps.
 */
export function readSharedVersions(repoRoot: string): SharedVersions {
  const sourceManifest = resolveSourceManifest(repoRoot);
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, sourceManifest), 'utf8'),
  ) as PackageManifest;
  const deps = manifest.dependencies ?? {};

  const versions = {} as Record<string, string>;
  // resolveSourceManifest only returns a manifest that declares all of
  // them, so there is no missing-singleton case left to handle here.
  for (const name of REQUIRED_SINGLETONS) {
    versions[name] = deps[name] as string;
  }

  return versions as SharedVersions;
}

/**
 * Reads REQUIRED_TOOL_VERSIONS from the same discovered source manifest's
 * dependencies and devDependencies (merged — @module-federation/enhanced is
 * a runtime dependency there, the rest are dev tooling). Same live-read
 * discipline as readSharedVersions, for the same reason.
 */
export function readToolVersions(repoRoot: string): ToolVersions {
  const sourceManifest = resolveSourceManifest(repoRoot);
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, sourceManifest), 'utf8'),
  ) as PackageManifest;
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
      `shared-versions: ${sourceManifest} is missing expected tool version(s): ${missing.join(', ')}.`,
    );
  }

  return versions as ToolVersions;
}
