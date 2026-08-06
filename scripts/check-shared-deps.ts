/**
 * The singleton drift gate — constitution Principle III.
 *
 * React, ReactDOM, and any shared package that holds state must resolve to a
 * single instance across the shell and every remote. Version drift in one of
 * those does not fail the build: it fails silently at runtime, when a remote
 * loads a second copy of React or a second auth context, and the bug surfaces
 * far from its cause.
 *
 * This reports and never edits a manifest. Which version is correct is a human
 * decision (same contract as .claude/agents/shared-deps-guard.md).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/**
 * Packages that MUST resolve to one instance at runtime.
 *
 * This list is explicit on purpose: "this must be a singleton" is a design
 * decision the code cannot infer. Adding a shared package that holds state or a
 * React context means adding it here in the same change — see constitution
 * Principle III and .claude/commands/add-shared-package.md.
 */
const SINGLETONS = [
  'react',
  'react-dom',
  '@enterprise-mfe/auth',
  // react-router holds routing context (history, matched routes) that will
  // cross the federation boundary once a remote exists — two copies would
  // produce two histories, the same class of bug as two Reacts. Added in
  // sprint 3 alongside the shell (research D6, constitution Principle III).
  'react-router',
  // The pub/sub registry a publisher and subscriber must actually share —
  // two copies would mean admin's role-change events never reach
  // dashboard's subscriber at all. Added in sprint 5 alongside apps/admin
  // (004-admin-remote research D2, constitution Principle III).
  '@enterprise-mfe/event-bus',
] as const;

const MANIFEST_DIRS = ['apps', 'packages'];
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

interface Declaration {
  manifest: string;
  field: (typeof DEPENDENCY_FIELDS)[number];
  range: string;
}

interface Manifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function workspaceManifests(): Array<{ path: string; manifest: Manifest }> {
  const found: Array<{ path: string; manifest: Manifest }> = [];

  for (const dir of MANIFEST_DIRS) {
    const absolute = join(REPO_ROOT, dir);
    let entries: string[];
    try {
      entries = readdirSync(absolute, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      // apps/ does not exist until the shell lands in sprint 3. Not an error.
      continue;
    }

    for (const entry of entries) {
      const manifestPath = join(dir, entry, 'package.json');
      try {
        const raw = readFileSync(join(REPO_ROOT, manifestPath), 'utf8');
        found.push({ path: manifestPath, manifest: JSON.parse(raw) as Manifest });
      } catch {
        // A directory without a package.json is not a workspace member.
      }
    }
  }

  return found;
}

function declarationsFor(
  name: string,
  manifests: Array<{ path: string; manifest: Manifest }>,
): Declaration[] {
  const declarations: Declaration[] = [];

  for (const { path, manifest } of manifests) {
    for (const field of DEPENDENCY_FIELDS) {
      const range = manifest[field]?.[name];
      if (range) {
        declarations.push({ manifest: path, field, range });
      }
    }
  }

  return declarations;
}

function main(): void {
  const manifests = workspaceManifests();

  if (manifests.length === 0) {
    console.log('check:shared-deps — no workspace packages found yet, nothing to compare.');
    return;
  }

  let drifted = false;

  for (const name of SINGLETONS) {
    const declarations = declarationsFor(name, manifests);

    if (declarations.length === 0) {
      console.log(`  ·  ${name} — not declared anywhere yet`);
      continue;
    }

    const ranges = new Set(declarations.map((declaration) => declaration.range));

    if (ranges.size === 1) {
      const [range] = [...ranges];
      console.log(`  ✔  ${name} — ${range} in ${declarations.length} manifest(s)`);
      continue;
    }

    drifted = true;
    console.error(`\n  ✖  ${name} — ${ranges.size} different ranges declared:\n`);
    console.error(`     ${'range'.padEnd(14)} ${'field'.padEnd(18)} manifest`);
    for (const declaration of declarations) {
      console.error(
        `     ${declaration.range.padEnd(14)} ${declaration.field.padEnd(18)} ${declaration.manifest}`,
      );
    }
  }

  if (drifted) {
    console.error(
      '\nSingleton version drift. Every manifest that declares one of these must use\n' +
        'an identical range — a mismatch does not fail the build, it fails at runtime\n' +
        'when a second copy loads. Pick the correct version and align every manifest.\n' +
        'See .specify/memory/constitution.md, Principle III.\n',
    );
    process.exit(1);
  }

  console.log(`\ncheck:shared-deps — ${SINGLETONS.length} singleton(s) in agreement.`);
}

main();
