import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import type { PlopTypes } from '@turbo/gen';
import { nextDevPort, registerDevRemote } from './remote/actions/register-dev-remote';
import { updateArchitectureDocs } from './remote/actions/update-architecture-docs';
import { writeApp } from './remote/actions/write-app';
import { createRemotePrompts } from './remote/prompts';
import type { RemoteAnswers } from './remote/types';
import { validateOutputDirAvailable } from './remote/validate';

function generateRemote(repoRoot: string, answers: RemoteAnswers): string {
  const registryPath = join(repoRoot, 'apps/shell/src/internal/federation/remotes.dev.json');
  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
    remotes: Array<{ entry: string }>;
  };
  const port = nextDevPort(registry);

  const targetDir =
    answers.mode === 'monorepo'
      ? join(repoRoot, 'apps', answers.name)
      : resolve(repoRoot, answers.outputPath ?? '');

  // Re-checked here (already checked once at prompt time, FR-014): the
  // filesystem can change between a prompt answer and action execution in
  // an interactive CLI. A second, identical refusal is cheap insurance
  // against writing over something that appeared in that window.
  const availability = validateOutputDirAvailable(targetDir, existsSync(targetDir));
  if (!availability.ok) {
    throw new Error(availability.reason);
  }

  const { filesCreated } = writeApp({
    mode: answers.mode,
    name: answers.name,
    routePath: answers.routePath,
    label: answers.label,
    port,
    repoRoot,
    targetDir,
  });

  const displayPath = relative(repoRoot, targetDir) || targetDir;
  const summary: string[] = [`Created ${filesCreated.length} file(s) under ${displayPath}.`];

  if (answers.mode === 'monorepo') {
    const { entry } = registerDevRemote({
      repoRoot,
      name: answers.name,
      routePath: answers.routePath,
      label: answers.label,
      port,
    });
    summary.push(`Registered in apps/shell/src/internal/federation/remotes.dev.json: ${entry}`);
    updateArchitectureDocs({ repoRoot, name: answers.name, label: answers.label });
    summary.push('Added one line to docs/architecture.md\'s "Remotes" section.');
    summary.push(
      'NOT done: staging/production registry registration — a deployment decision (ADR-0012, FR-010), not a scaffolding one.',
    );
  } else {
    summary.push('No registry touched — standalone mode owns no registry to write to (FR-016).');
    summary.push(
      'NOT done: no live publish to GitHub Packages occurred (FR-019) — pnpm install in the generated ' +
        'project will fail until packages/* are published at least once. See its README.md.',
    );
  }

  const message = `Generated ${answers.mode} remote "${answers.name}".\n${summary.map((line) => `  - ${line}`).join('\n')}`;
  console.log(`\n${message}\n`);
  return message;
}

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  // turbo/generators/config.ts -> monorepo root, two levels up. Derived from
  // Plop's own tracked plopfile path, not __dirname/import.meta.url: @turbo/gen
  // bundles every imported module into one file via esbuild before running
  // it, so a module-local __dirname no longer points at each file's real
  // source location once bundled — found by actually running
  // `pnpm turbo gen remote`, not by inspecting the bundler config.
  const repoRoot = dirname(dirname(plop.getPlopfilePath()));

  // Precondition 1 (generator-contract.md): apps/dashboard and apps/admin
  // both existing is what proves this is a real, uncorrupted checkout of
  // this monorepo — the two real remotes the templates were extracted from.
  const requiredApps = ['apps/dashboard', 'apps/admin'];
  const missing = requiredApps.filter((path) => !existsSync(join(repoRoot, path)));
  if (missing.length > 0) {
    throw new Error(
      `pnpm turbo gen remote: expected ${missing.join(' and ')} to exist — run this from a complete checkout of the monorepo root, not a partial one.`,
    );
  }

  plop.setActionType('generate-remote', (answers) =>
    generateRemote(repoRoot, answers as RemoteAnswers),
  );

  plop.setGenerator('remote', {
    description:
      'Scaffold a new micro-frontend remote (monorepo or standalone mode), extracted from apps/dashboard and apps/admin (ADR-0008).',
    prompts: createRemotePrompts(repoRoot),
    actions: [{ type: 'generate-remote' }],
  });
}
