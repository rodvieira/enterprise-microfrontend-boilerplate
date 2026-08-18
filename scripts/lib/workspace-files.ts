import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Which files a repo-wide rewrite is allowed to touch.
 *
 * Shared by `pnpm rename` and `pnpm eject` rather than duplicated: both walk
 * the whole checkout replacing identifiers, and a directory or extension
 * that only one of them knew about would mean one command renaming a file
 * the other silently skipped.
 */

/** Build output and VCS internals: never walked, never rewritten. */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '_site',
  '.turbo',
  'coverage',
  'playwright-report',
  'test-results',
]);

/**
 * Every extension that carries a project identifier somewhere in this repo,
 * plus the near neighbours of each. `.mts` is not hypothetical —
 * vitest.config.mts is the single file using it, and leaving it out silently
 * skipped the one config that names every workspace project.
 */
const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.jsonc',
  '.md',
  '.css',
  '.html',
  '.yml',
  '.yaml',
  '.template',
  '.txt',
]);

/** Extensionless files that still carry identifiers. */
const TEXT_FILENAMES = new Set(['.npmrc', '.gitignore', '.env.example']);

export function walkTextFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkTextFiles(join(dir, entry.name), found);
      continue;
    }
    const dot = entry.name.lastIndexOf('.');
    const extension = dot > 0 ? entry.name.slice(dot) : '';
    if (TEXT_EXTENSIONS.has(extension) || TEXT_FILENAMES.has(entry.name)) {
      found.push(join(dir, entry.name));
    }
  }
  return found;
}
