import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PlopTypes } from '@turbo/gen';
import type { RemoteAnswers } from './types';
import {
  validateLabel,
  validateName,
  validateOutputDirAvailable,
  validateOutputPathOutsideRepo,
  validateRoutePath,
} from './validate';

function existingAppNames(repoRoot: string): string[] {
  const appsDir = join(repoRoot, 'apps');
  try {
    return readdirSync(appsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    // A missing apps/ directory means a corrupted/partial checkout — config.ts
    // already refused before prompting in that situation.
    return [];
  }
}

function existingRoutePaths(repoRoot: string): string[] {
  const registryPath = join(repoRoot, 'apps/shell/src/internal/federation/remotes.dev.json');
  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
    remotes: Array<{ routePath: string }>;
  };
  return registry.remotes.map((remote) => remote.routePath);
}

/**
 * Every prompt's `validate` runs before plop's inquirer-backed prompt loop
 * advances to the next question — an invalid answer re-prompts the same
 * question rather than proceeding, so by the time all prompts resolve, the
 * full answer set has already passed every check in validate.ts (FR-002,
 * FR-014). No file is written until every prompt has resolved.
 *
 * Takes repoRoot explicitly (computed once in config.ts via
 * plop.getPlopfilePath()) rather than deriving it here: @turbo/gen bundles
 * every imported module into one file via esbuild before running it, so a
 * module-local __dirname/import.meta.url no longer points at this file's
 * real location once bundled — found by actually running
 * `pnpm turbo gen remote`, not by inspecting the bundler config.
 */
export function createRemotePrompts(repoRoot: string): PlopTypes.PromptQuestion[] {
  return [
    {
      type: 'list',
      name: 'mode',
      message: 'Output mode:',
      choices: [
        { name: 'Monorepo — apps/<name>, workspace-linked (this repository)', value: 'monorepo' },
        { name: 'Standalone — an independent project, published deps', value: 'standalone' },
      ],
    },
    {
      type: 'input',
      name: 'name',
      message: 'Remote name (kebab-case, e.g. "billing"):',
      validate: (input: string) => {
        const result = validateName(input.trim(), existingAppNames(repoRoot));
        return result.ok ? true : (result.reason ?? 'Invalid name.');
      },
      filter: (input: string) => input.trim(),
    },
    {
      type: 'input',
      name: 'routePath',
      message: 'Route path (e.g. "/billing"):',
      validate: (input: string) => {
        const result = validateRoutePath(input.trim(), existingRoutePaths(repoRoot));
        return result.ok ? true : (result.reason ?? 'Invalid route path.');
      },
      filter: (input: string) => input.trim(),
    },
    {
      type: 'input',
      name: 'label',
      message: 'Navigation label (e.g. "Billing"):',
      validate: (input: string) => {
        const result = validateLabel(input.trim());
        return result.ok ? true : (result.reason ?? 'Invalid label.');
      },
      filter: (input: string) => input.trim(),
    },
    {
      type: 'input',
      name: 'outputPath',
      message: 'Output path, outside this repository (e.g. "../billing"):',
      when: (answers: Partial<RemoteAnswers>) => answers.mode === 'standalone',
      validate: (input: string) => {
        const outside = validateOutputPathOutsideRepo(input.trim(), repoRoot);
        if (!outside.ok) {
          return outside.reason ?? 'Invalid output path.';
        }
        const resolved = resolve(repoRoot, input.trim());
        const available = validateOutputDirAvailable(resolved, existsSync(resolved));
        return available.ok ? true : (available.reason ?? 'Output path unavailable.');
      },
      filter: (input: string) => input.trim(),
    },
  ];
}
