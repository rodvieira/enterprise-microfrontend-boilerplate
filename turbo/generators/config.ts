import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import type { PlopTypes } from '@turbo/gen';
import { formatPaths } from './remote/actions/format-output';
import { nextDevPort, registerDevRemote } from './remote/actions/register-dev-remote';
import { updateArchitectureDocs } from './remote/actions/update-architecture-docs';
import { writeApp } from './remote/actions/write-app';
import { createRemotePrompts } from './remote/prompts';
import { resolveSourceManifest } from './remote/shared-versions';
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

    // Monorepo mode only: every path here is inside this repository, so this
    // repository's formatter is the right one to apply. A standalone project
    // owns its own tooling and is deliberately left alone.
    const formatted = formatPaths(repoRoot, [
      relative(repoRoot, targetDir),
      'apps/shell/src/internal/federation/remotes.dev.json',
      'docs/architecture.md',
    ]);
    if (!formatted) {
      summary.push('Could not run Biome — run `pnpm lint:fix` to format the generated files.');
    }
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

  // Precondition 1 (generator-contract.md): the generator needs the shell to
  // register a remote into, and at least one existing remote to read shared
  // versions from (shared-versions.ts).
  //
  // This used to require apps/dashboard AND apps/admin by name. That made a
  // correct, fully-working checkout fail the moment the example remotes were
  // swapped for a company's own — which is exactly what `pnpm eject` does.
  // What actually has to hold is structural, so that is what gets checked:
  // resolveSourceManifest throws with its own, more specific message when no
  // remote qualifies.
  if (!existsSync(join(repoRoot, 'apps/shell'))) {
    throw new Error(
      'pnpm turbo gen remote: expected apps/shell to exist — run this from the monorepo root, not a partial checkout.',
    );
  }
  resolveSourceManifest(repoRoot);

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
