/**
 * `pnpm rename` — make a fresh clone yours, without giving anything up.
 *
 * Renames the npm scope (`@enterprise-mfe`) and the project name
 * (`enterprise-microfrontend-boilerplate`) across the whole checkout. That
 * second one is not cosmetic: it is the root package name, the shell's
 * `<title>`, and the text in the shell's own header — this boilerplate is
 * visibly branding whatever you ship until it is replaced.
 *
 * Deliberately smaller than `pnpm eject`. Rename keeps everything: both
 * example remotes, the docs, and itself, so you can rename on day one and
 * keep learning from the examples. Eject is the later, one-way step that
 * removes them.
 *
 * Re-running after a rename is a no-op — the old identifiers are gone.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { formatPaths } from '../turbo/generators/remote/actions/format-output';
import { renameScope, validateScope } from './eject/transforms';
import { walkTextFiles } from './lib/workspace-files';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const OLD_SCOPE = '@enterprise-mfe';
const OLD_PROJECT_NAME = 'enterprise-microfrontend-boilerplate';

/** A project name that is legal as an npm package name and as a directory. */
const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

interface Options {
  scope: string;
  projectName: string;
  yes: boolean;
}

function fail(message: string): never {
  console.error(`\nrename: ${message}\n`);
  process.exit(1);
}

function flag(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(`--${name}`);
  if (index >= 0) return argv[index + 1];
  return argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function parseOptions(argv: readonly string[]): Options {
  const scope = flag(argv, 'scope');
  if (!scope) {
    fail('usage: pnpm rename --scope @acme [--name acme-platform] [--yes]');
  }

  const scopeCheck = validateScope(scope);
  if (!scopeCheck.ok) fail(scopeCheck.reason as string);

  // The scope without its "@" is already known to be npm-legal and is the
  // name the person just chose, so it is a better default than leaving this
  // boilerplate's name on their package and in their header.
  const projectName = flag(argv, 'name') ?? scope.slice(1);
  if (!PROJECT_NAME_PATTERN.test(projectName)) {
    fail(
      `"${projectName}" is not a usable project name — lowercase letters, digits, and hyphens, starting with a letter or digit.`,
    );
  }

  return { scope, projectName, yes: argv.includes('--yes') };
}

function assertCleanTree(): void {
  let status: string;
  try {
    status = execFileSync('git', ['status', '--porcelain'], { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch {
    fail(
      'this is not a git checkout — refusing to run, because `git reset --hard` is the only undo.',
    );
  }
  if (status.trim().length > 0) {
    fail(
      'the working tree has uncommitted changes. Commit or stash them first — this rewrites\n' +
        'most files in the repository, and a clean tree is what makes `git reset --hard` a\n' +
        'complete undo.',
    );
  }
}

async function confirm(options: Options): Promise<void> {
  console.log(`
This rewrites identifiers across the whole checkout:

  npm scope       ${OLD_SCOPE}  ->  ${options.scope}
  project name    ${OLD_PROJECT_NAME}  ->  ${options.projectName}

Nothing is deleted. The example remotes, the docs, and this command all stay.
Undo is \`git reset --hard\`.
`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('Type the new scope to confirm: ');
    if (answer.trim() !== options.scope) {
      fail('confirmation did not match — nothing was changed.');
    }
  } finally {
    rl.close();
  }
}

function main(): void {
  const options = parseOptions(process.argv.slice(2));
  assertCleanTree();

  const run = async () => {
    if (!options.yes) await confirm(options);

    let changed = 0;
    for (const absolute of walkTextFiles(REPO_ROOT)) {
      const original = readFileSync(absolute, 'utf8');
      const renamed = renameScope(
        renameScope(original, OLD_SCOPE, options.scope),
        OLD_PROJECT_NAME,
        options.projectName,
      );
      if (renamed !== original) {
        writeFileSync(absolute, renamed);
        changed += 1;
      }
    }

    // A scope of a different length re-flows lines the formatter cares about.
    if (!formatPaths(REPO_ROOT, ['.'])) {
      console.warn('rename: could not run Biome — run `pnpm lint:fix` to format the result.');
    }

    console.log(`
Renamed ${changed} file(s).

Next:
  pnpm install          # the lockfile still names the old scope
  pnpm dev

Not done, because a script should not decide it for you:
  - renaming the repository itself
  - the shell's visible header and <title> now read "${options.projectName}" —
    set a nicer display name in apps/shell/src/internal/chrome/layout.tsx
    and apps/shell/index.html if you want one
`);
  };

  // Not top-level await: tsx transpiles this to CJS, where that is a hard
  // error — the same reason scripts/eject.ts calls its main() this way.
  run().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

main();
