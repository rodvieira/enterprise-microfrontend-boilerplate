/**
 * Builds every app and assembles them into one deployable directory.
 *
 * This exists as a script rather than a list of steps inside a CI workflow
 * because the host runs it, not GitHub: Vercel's build step is a single
 * command, and duplicating the assemble logic into a `vercel.json` string
 * would put the same layout in two places that could drift.
 *
 * The layout is the one ADR-0019 settled on: the shell at the root, and
 * each remote's own static build under `/remotes/<name>/` — never at
 * `/dashboard` or `/admin`, which belong to the shell's own router. A
 * remote's standalone index.html sitting at the path the router owns means
 * a hard navigation is served that file directly and never reaches the
 * shell at all.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUTPUT_DIR = '_site';

/** Every remote that gets composed into the deployed shell. */
const REMOTES = ['dashboard', 'admin'] as const;

function run(command: string, args: readonly string[], env: NodeJS.ProcessEnv = {}): void {
  console.log(`  $ ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

function main(): void {
  const output = join(REPO_ROOT, OUTPUT_DIR);
  rmSync(output, { recursive: true, force: true });

  for (const remote of REMOTES) {
    run('pnpm', ['--filter', `@enterprise-mfe/${remote}`, 'run', 'build']);
  }

  // The one build whose output depends on the environment: it copies the
  // matching remotes.<env>.json to remotes.json (ADR-0012).
  run('pnpm', ['--filter', '@enterprise-mfe/shell', 'run', 'build'], {
    FEDERATION_ENV: 'production',
  });

  mkdirSync(output, { recursive: true });
  cpSync(join(REPO_ROOT, 'apps/shell/dist'), output, { recursive: true });
  for (const remote of REMOTES) {
    cpSync(join(REPO_ROOT, 'apps', remote, 'dist'), join(output, 'remotes', remote), {
      recursive: true,
    });
  }

  // Kept even though Vercel's rewrite makes it unreachable there: it is what
  // lets this same output directory be dropped onto a static host with no
  // rewrite support and still serve the shell's client-side routes. Safe to
  // copy because <base href> is an absolute path, not relative to whatever
  // URL the file was served from.
  cpSync(join(REPO_ROOT, 'apps/shell/dist/index.html'), join(output, '404.html'));

  console.log(`\nbuild:site — assembled ${OUTPUT_DIR}/ (shell at root, remotes under /remotes/).`);
}

main();
