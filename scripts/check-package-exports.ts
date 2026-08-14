/**
 * The publishable-shape gate.
 *
 * Inside this monorepo every package resolves through its `exports` field to
 * raw TypeScript in `src/` — which is why the apps can import them with no
 * build step, and why `pnpm dev` hot-reloads a change to packages/ui.
 * External consumers cannot do that: their bundler excludes node_modules
 * from its TypeScript loader rules, so raw `.ts` never compiles.
 *
 * The fix is `publishConfig.exports`, which npm/pnpm swap in at publish time
 * so the tarball points at `dist/` instead. That swap is invisible locally:
 * nothing in a normal build, test, or typecheck run exercises it, and a
 * missing `files` entry or a renamed output would only surface as a broken
 * install for whoever consumed the package next.
 *
 * So this packs each package for real and asserts every path the *published*
 * manifest advertises actually exists inside the tarball.
 *
 * Reports and never edits, same contract as check-shared-deps.ts.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PACKAGES_DIR = 'packages';

interface Manifest {
  name?: string;
  private?: boolean;
  exports?: unknown;
  publishConfig?: { exports?: unknown };
}

/** Every path an `exports` map advertises, whatever nesting it uses. */
function exportedPaths(node: unknown, found: string[] = []): string[] {
  if (typeof node === 'string') {
    found.push(node);
    return found;
  }
  if (typeof node === 'object' && node !== null) {
    for (const value of Object.values(node)) exportedPaths(value, found);
  }
  return found;
}

function packagesToCheck(): Array<{ dir: string; manifest: Manifest }> {
  return readdirSync(join(REPO_ROOT, PACKAGES_DIR), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .flatMap((dir) => {
      try {
        const manifest = JSON.parse(
          readFileSync(join(REPO_ROOT, PACKAGES_DIR, dir, 'package.json'), 'utf8'),
        ) as Manifest;
        // A private package is never published, so it has no published shape
        // to verify — federation-utils is host-side only (ADR-0014).
        if (manifest.private || !manifest.publishConfig?.exports) return [];
        return [{ dir, manifest }];
      } catch {
        return [];
      }
    });
}

/** File list of a freshly packed tarball, as `package/`-relative paths. */
function packedFiles(dir: string, destination: string): string[] {
  execFileSync('pnpm', ['pack', '--pack-destination', destination], {
    cwd: join(REPO_ROOT, PACKAGES_DIR, dir),
    stdio: 'pipe',
  });
  const tarball = readdirSync(destination).find((name) => name.endsWith('.tgz'));
  if (!tarball) throw new Error(`pnpm pack produced no tarball for packages/${dir}.`);

  const listing = execFileSync('tar', ['-tzf', join(destination, tarball)], { encoding: 'utf8' });
  return listing.split('\n').filter(Boolean);
}

function publishedManifest(destination: string): Manifest {
  const tarball = readdirSync(destination).find((name) => name.endsWith('.tgz')) as string;
  const raw = execFileSync('tar', ['-xzOf', join(destination, tarball), 'package/package.json'], {
    encoding: 'utf8',
  });
  return JSON.parse(raw) as Manifest;
}

function main(): void {
  const packages = packagesToCheck();

  if (packages.length === 0) {
    console.log('check:package-exports — no publishable package declares publishConfig.exports.');
    return;
  }

  let broken = false;

  for (const { dir, manifest } of packages) {
    const destination = mkdtempSync(join(tmpdir(), `pack-${dir}-`));
    try {
      const files = new Set(packedFiles(dir, destination));
      const published = publishedManifest(destination);
      const advertised = exportedPaths(published.exports);

      if (advertised.length === 0) {
        broken = true;
        console.error(`  ✖  ${manifest.name} — published manifest advertises no exports at all.`);
        continue;
      }

      const missing = advertised.filter(
        (path) => !files.has(`package/${path.replace(/^\.\//, '')}`),
      );

      if (missing.length > 0) {
        broken = true;
        console.error(
          `\n  ✖  ${manifest.name} — published exports point at files not in the tarball:`,
        );
        for (const path of missing) console.error(`     ${path}`);
        continue;
      }

      // Shipping src/ alongside dist/ is not fatal, but it means the package
      // is twice the size it needs to be and hints `files` drifted.
      const shipsSource = [...files].some((path) => path.startsWith('package/src/'));
      const note = shipsSource ? ' (also ships src/ — check "files")' : '';
      console.log(`  ✔  ${manifest.name} — ${advertised.length} export path(s) present${note}`);
    } finally {
      rmSync(destination, { recursive: true, force: true });
    }
  }

  if (broken) {
    console.error(
      '\nA published package would not resolve for anyone installing it. Every path in\n' +
        "publishConfig.exports must exist in the packed tarball — check the package's\n" +
        '"files" field and that `pnpm build` ran before packing.\n',
    );
    process.exit(1);
  }

  console.log(
    `\ncheck:package-exports — ${packages.length} package(s) publish a resolvable shape.`,
  );
}

main();
