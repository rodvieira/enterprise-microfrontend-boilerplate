/**
 * `pnpm eject` — turn this boilerplate into your company's own repository.
 *
 * Renames the npm scope, replaces the two example remotes with your first
 * real one, and strips the artifacts of *this* project's build process
 * (specs, ADRs, blueprint) that mean nothing in your repo.
 *
 * It runs once and then deletes itself. The undo is `git reset --hard`,
 * which is why it refuses to start on a dirty tree.
 *
 * What it deliberately does NOT do: rewrite prose. `docs/architecture.md`
 * narrates the example remotes across whole paragraphs, and no regex turns
 * that into a description of *your* platform. Everything it could not
 * finish is listed in EJECT-TODO.md rather than silently mangled.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { formatPaths } from '../turbo/generators/remote/actions/format-output';
import {
  nextDevPort,
  registerDevRemote,
} from '../turbo/generators/remote/actions/register-dev-remote';
import { writeApp } from '../turbo/generators/remote/actions/write-app';
import {
  validateLabel,
  validateName,
  validateRoutePath,
} from '../turbo/generators/remote/validate';
import {
  type RemoteRegistry,
  type ReviewHit,
  emptyRegistry,
  findRemovedAppHits,
  findReviewHits,
  flattenAdrReferences,
  formatJson,
  renameScope,
  rewriteBuildSiteRemotes,
  rewriteCommitlintScopes,
  rewritePlaywrightWebServers,
  rewriteVitestProjects,
  validateScope,
} from './eject/transforms';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const OLD_SCOPE = '@enterprise-mfe';

/**
 * This boilerplate's own name, which is not only metadata: it is the root
 * package name, the shell's <title>, and the text in the shell's header
 * chrome — i.e. it is visibly branding whatever the adopter ships until it
 * is replaced.
 */
const OLD_PROJECT_NAME = 'enterprise-microfrontend-boilerplate';
const REMOVED_APPS = ['dashboard', 'admin'] as const;
const DEV_REGISTRY = 'apps/shell/src/internal/federation/remotes.dev.json';

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
 * Every extension that carries the old scope somewhere in this repo, plus
 * the near neighbours of each. `.mts` is not hypothetical — vitest.config.mts
 * is the single file using it, and leaving it out silently skipped the one
 * config that names every workspace project.
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
const TEXT_FILENAMES = new Set(['.npmrc', '.gitignore', '.env.example']);

/** Everything that documents how *this* repo was built, not how yours works. */
const PROCESS_ARTIFACTS = [
  'specs',
  '.specify',
  'docs/decisions',
  'docs/blueprint.html',
  'docs/analise-enterprise-mfe-boilerplate.md',
  'docs/enterprise-microfrontend-boilerplate-analysis.md',
];

/** The example remotes' own end-to-end specs assert their domain content. */
const EXAMPLE_E2E_SPECS = [
  'apps/shell/e2e/dashboard-composition.spec.ts',
  'apps/shell/e2e/admin-composition.spec.ts',
  'apps/shell/e2e/remote-failure.spec.ts',
];

/** Removed last, once they have done their job. */
const SELF = ['scripts/eject.ts', 'scripts/eject'];

interface Options {
  scope: string;
  /** The first remote's name. */
  name: string;
  routePath: string;
  label: string;
  /** Replaces OLD_PROJECT_NAME. Defaults to the scope without its "@". */
  projectName: string;
  yes: boolean;
}

function fail(message: string): never {
  console.error(`\neject: ${message}\n`);
  process.exit(1);
}

function flag(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(`--${name}`);
  if (index >= 0) return argv[index + 1];
  const inline = argv.find((arg) => arg.startsWith(`--${name}=`));
  return inline?.slice(name.length + 3);
}

function titleCase(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseOptions(argv: readonly string[]): Options {
  const scope = flag(argv, 'scope');
  const name = flag(argv, 'first-remote');

  if (!scope || !name) {
    fail(
      'usage: pnpm eject --scope @acme --first-remote payments\n' +
        '       [--route /payments] [--label "Payments"] [--project-name acme-platform] [--yes]',
    );
  }

  const scopeCheck = validateScope(scope);
  if (!scopeCheck.ok) fail(scopeCheck.reason as string);

  const existingApps = readdirSync(join(REPO_ROOT, 'apps'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const nameCheck = validateName(name, existingApps);
  if (!nameCheck.ok) fail(nameCheck.reason as string);

  const routePath = flag(argv, 'route') ?? `/${name}`;
  const routeCheck = validateRoutePath(routePath, []);
  if (!routeCheck.ok) fail(routeCheck.reason as string);

  const label = flag(argv, 'label') ?? titleCase(name);
  const labelCheck = validateLabel(label);
  if (!labelCheck.ok) fail(labelCheck.reason as string);

  // The scope minus its "@" is the one name we already know is npm-legal and
  // that the person just chose — a better default than leaving this
  // boilerplate's name on their package and in their header.
  const projectName = flag(argv, 'project-name') ?? scope.slice(1);

  return { scope, name, routePath, label, projectName, yes: argv.includes('--yes') };
}

function assertPreconditions(): void {
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
      'the working tree has uncommitted changes. Commit or stash them first — this rewrites and\n' +
        'deletes a lot of files, and a clean tree is what makes `git reset --hard` a complete undo.',
    );
  }
  if (!existsSync(join(REPO_ROOT, 'apps', REMOVED_APPS[0]))) {
    fail(`apps/${REMOVED_APPS[0]} is already gone — this repository looks ejected already.`);
  }
}

function walkTextFiles(dir: string, found: string[] = []): string[] {
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

function edit(path: string, transform: (content: string) => string): void {
  const absolute = join(REPO_ROOT, path);
  writeFileSync(absolute, transform(readFileSync(absolute, 'utf8')));
}

function remove(path: string): void {
  rmSync(join(REPO_ROOT, path), { recursive: true, force: true });
}

function generateFirstRemote(options: Options): number {
  // Emptied *before* generating so nextDevPort assigns 3001 rather than the
  // next port after the examples — the adopter's first remote should not
  // start at 3003 with two unexplained gaps below it.
  edit(DEV_REGISTRY, (content) =>
    formatJson(emptyRegistry(JSON.parse(content) as RemoteRegistry, { keepOrigins: false })),
  );

  const port = nextDevPort({ remotes: [] });
  writeApp({
    mode: 'monorepo',
    name: options.name,
    routePath: options.routePath,
    label: options.label,
    port,
    repoRoot: REPO_ROOT,
    targetDir: join(REPO_ROOT, 'apps', options.name),
  });
  registerDevRemote({
    repoRoot: REPO_ROOT,
    name: options.name,
    routePath: options.routePath,
    label: options.label,
    port,
  });

  return port;
}

function rewriteConfigs(options: Options, port: number): void {
  edit('vitest.config.mts', (c) => rewriteVitestProjects(c, REMOVED_APPS, options.name));
  edit('apps/shell/playwright.config.ts', (c) =>
    rewritePlaywrightWebServers(c, REMOVED_APPS, {
      scope: OLD_SCOPE,
      name: options.name,
      port,
    }),
  );
  edit('commitlint.config.mjs', (c) => rewriteCommitlintScopes(c, REMOVED_APPS, options.name));
  edit('scripts/build-site.ts', (c) => rewriteBuildSiteRemotes(c, options.name));

  // Staging and production point at URLs only the adopter knows.
  for (const environment of ['staging', 'production']) {
    const path = `apps/shell/src/internal/federation/remotes.${environment}.json`;
    edit(path, (content) =>
      formatJson(emptyRegistry(JSON.parse(content) as RemoteRegistry, { keepOrigins: false })),
    );
  }
}

function removeProcessArtifacts(): void {
  for (const path of [...PROCESS_ARTIFACTS, ...EXAMPLE_E2E_SPECS]) {
    remove(path);
  }
  for (const app of REMOVED_APPS) {
    remove(join('apps', app));
  }
  // spec-kit tooling for a process whose specs/ no longer exist. The agents
  // under .claude/agents/ are kept — they review real architectural rules
  // this repo still enforces.
  const skills = join(REPO_ROOT, '.claude', 'skills');
  if (existsSync(skills)) {
    for (const entry of readdirSync(skills)) {
      if (entry.startsWith('speckit-')) remove(join('.claude', 'skills', entry));
    }
  }
}

function rewriteRemainingFiles(options: Options): ReviewHit[] {
  const hits: ReviewHit[] = [];

  for (const absolute of walkTextFiles(REPO_ROOT)) {
    const path = relative(REPO_ROOT, absolute);
    if (SELF.some((self) => path === self || path.startsWith(`${self}/`))) continue;

    const original = readFileSync(absolute, 'utf8');
    const flattened = flattenAdrReferences(original);
    const renamed = renameScope(
      renameScope(flattened.content, OLD_SCOPE, options.scope),
      OLD_PROJECT_NAME,
      options.projectName,
    );

    if (renamed !== original) writeFileSync(absolute, renamed);

    hits.push(...findReviewHits(renamed, path));
    hits.push(...findRemovedAppHits(renamed, path, REMOVED_APPS));
  }

  return hits;
}

function writeTodo(options: Options, hits: readonly ReviewHit[]): void {
  const byFile = new Map<string, ReviewHit[]>();
  for (const hit of hits) {
    byFile.set(hit.file, [...(byFile.get(hit.file) ?? []), hit]);
  }

  const sections = [...byFile.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, fileHits]) => {
      const lines = fileHits
        .sort((a, b) => a.line - b.line)
        .map((hit) => `- \`${file}:${hit.line}\` — ${hit.text.slice(0, 160)}`)
        .join('\n');
      return `### ${file}\n\n${lines}`;
    });

  const body = `# Eject TODO

\`pnpm eject\` renamed the npm scope to \`${options.scope}\` and the project to
\`${options.projectName}\`, replaced the example remotes with \`apps/${options.name}\`,
and removed the artifacts of the boilerplate's own build process.

Everything below is what a script should **not** decide for you. None of it
breaks the build — it is prose and references pointing at things that no
longer exist here.

## Needs a human

${sections.length > 0 ? sections.join('\n\n') : '_Nothing — every reference was resolved automatically._'}

## Do this first

\`\`\`bash
pnpm install   # regenerates pnpm-lock.yaml for the renamed scope and the new remote
pnpm dev       # shell on :3000, ${options.name} on the port above
\`\`\`

The lockfile still describes the pre-eject workspace. Until you run \`pnpm install\`
and commit the result, CI's \`pnpm install --frozen-lockfile\` will fail.

## Not done by design

- **Rename the repository itself**, and fix \`.changeset/config.json\` — its
  \`repo\` field still names the original owner (only the repository half was
  renamed to \`${options.projectName}\`).
- **Check the shell's visible name.** The header and \`<title>\` now read
  "${options.projectName}", taken from your scope; set a nicer display name in
  \`apps/shell/src/internal/chrome/layout.tsx\` and \`apps/shell/index.html\` if
  you want one.
- **Reset git history** if you want this to start as your own project:
  \`rm -rf .git && git init\`. Until then \`git reset --hard\` still undoes this eject.
- **Point \`publishConfig\` at your registry** in each \`packages/*/package.json\`;
  they currently target GitHub Packages under the old owner. Note the packages
  \`exports\` field points at raw TypeScript source — add a build step before
  publishing, or a standalone consumer's bundler will not compile them.
- **Fill in \`remotes.staging.json\` / \`remotes.production.json\`** with your own
  URLs and \`allowedOrigins\`; the eject emptied them because only you know them.
  If you serve the shell from a subpath rather than a domain root, add
  \`"basePath": "/your-repo/"\` back to that environment's registry — it was
  dropped precisely because its old value named this boilerplate's repository.
- **Rewrite \`docs/architecture.md\`** to describe your platform. It still narrates
  the example remotes in places.
- **Record your own decisions.** The ADRs were removed with the rest of this
  project's history; \`docs/decisions/\` is a habit worth keeping.
`;

  writeFileSync(join(REPO_ROOT, 'EJECT-TODO.md'), body);
}

/**
 * Hands the result to Biome rather than trying to emit
 * already-formatted output.
 *
 * The whole repository, not just the generated app: the eject rewrites
 * imports, package names, and prose across almost every file, and a scope of
 * a different length re-flows lines the formatter cares about.
 */
function formatWrittenFiles(): void {
  if (!formatPaths(REPO_ROOT, ['.'])) {
    console.warn(
      'eject: could not run Biome automatically — run `pnpm lint:fix` to format the result.',
    );
  }
}

function removeSelf(): void {
  edit('package.json', (content) => content.replace(/^\s*"eject": "[^"]*",\n/m, ''));
  edit('vitest.config.mts', (content) =>
    content.replace(
      /\n\s*\{\n\s*extends: true,\n\s*test: \{\n\s*name: 'eject',\n(?:[^{}]*\n)*?\s*\},\n\s*\},/,
      '',
    ),
  );
  for (const path of SELF) remove(path);
}

async function confirm(options: Options): Promise<void> {
  console.log(`
This rewrites the repository in place:

  scope           ${OLD_SCOPE}  ->  ${options.scope}
  project name    ${OLD_PROJECT_NAME}  ->  ${options.projectName}
  first remote    apps/${options.name}  (route ${options.routePath}, label "${options.label}")
  removed         apps/${REMOVED_APPS.join(', apps/')}
  removed         ${PROCESS_ARTIFACTS.join(', ')}

Undo is \`git reset --hard\` (plus deleting untracked files).
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

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  assertPreconditions();
  if (!options.yes) await confirm(options);

  const port = generateFirstRemote(options);
  rewriteConfigs(options, port);
  removeProcessArtifacts();
  const hits = rewriteRemainingFiles(options);
  writeTodo(options, hits);
  removeSelf();
  formatWrittenFiles();

  console.log(`
Ejected.

  apps/${options.name}    your first remote, on port ${port}
  EJECT-TODO.md${' '.repeat(Math.max(1, options.name.length - 8))}${hits.length} spot(s) needing a human

Next:
  pnpm install && pnpm dev
`);
}

// Not top-level `await`: tsx transpiles this to CJS (the repo root is not
// "type": "module"), where top-level await is a hard error — the same reason
// scripts/check-shared-deps.ts calls its main() directly.
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
