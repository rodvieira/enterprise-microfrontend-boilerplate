/**
 * The singleton drift gate.
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
 * React context means adding it here in the same change — see CLAUDE.md and
 * .claude/commands/add-shared-package.md.
 */
const SINGLETONS = [
  'react',
  'react-dom',
  '@enterprise-mfe/auth',
  // react-router holds routing context (history, matched routes) that will
  // cross the federation boundary once a remote exists — two copies would
  // produce two histories, the same class of bug as two Reacts.
  'react-router',
  // The pub/sub registry a publisher and subscriber must actually share —
  // two copies would mean admin's role-change events never reach
  // dashboard's subscriber at all.
  '@enterprise-mfe/event-bus',
  // The telemetry sink the host installs. Two copies would mean a remote
  // reporting into its own console-backed default while the host believes
  // everything is being sent to its real vendor — a monitoring gap that
  // looks exactly like healthy silence.
  '@enterprise-mfe/telemetry',
  // Build-time, unlike everything above it, and here for the same reason
  // they are: every app ships its own compiled Tailwind, so a composed page
  // carries one preflight per app. Identical versions make those duplicates
  // harmless. Different majors make them a silent visual bug — whichever
  // remote's reset loads last quietly restyles the others' base elements,
  // with nothing failing and nothing to grep for.
  'tailwindcss',
  '@tailwindcss/postcss',
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
      // A missing apps/ or packages/ directory is not an error.
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
        "See CLAUDE.md's architecture rules.\n",
    );
    process.exit(1);
  }

  console.log(`\ncheck:shared-deps — ${SINGLETONS.length} singleton(s) in agreement.`);
}

main();
