import { execFileSync } from 'node:child_process';

/**
 * Hands generated files to Biome instead of trying to emit
 * already-formatted output.
 *
 * Two things this repository generates are formatted by construction and
 * cannot practically be pre-matched to Biome's own output:
 *
 * - `registerDevRemote` writes the dev registry with a plain
 *   `JSON.stringify(…, null, 2)`, which always expands short arrays across
 *   lines while Biome collapses them.
 * - The placeholder component's JSX prose is re-flowed to fill the line
 *   width, so where the template happens to wrap depends on how long the
 *   remote's label is — a template can't be written to satisfy every label.
 *
 * Both left the repository failing its own `pnpm lint` immediately after
 * `pnpm turbo gen remote`, which is a confusing first experience: the
 * person did nothing wrong and CI is red. Formatting the output is the fix,
 * and Biome is already the formatter this repo uses — a second
 * implementation inside the generator would only drift from it.
 *
 * Best-effort by design: a failure here means the files are written but
 * unformatted, which `pnpm lint:fix` resolves. It must never fail the
 * generation that already succeeded.
 */
export function formatPaths(repoRoot: string, paths: readonly string[]): boolean {
  if (paths.length === 0) return true;
  try {
    execFileSync('node_modules/.bin/biome', ['check', '--write', ...paths], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}
