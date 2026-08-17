import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(full) : [full];
  });
}

/**
 * The stub works with zero configuration and contacts nothing.
 *
 * Asserted against the source rather than by mocking, because the guarantee is
 * "this package has no integration point at all" — which a runtime test cannot
 * prove by absence.
 */
describe('the stub is self-contained', () => {
  const files = sourceFiles(SRC);

  it.each(files)('%s makes no network call, and reads no storage or env', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest/);
    expect(source).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
    expect(source).not.toMatch(/process\.env|import\.meta\.env/);
  });

  it('keeps the stub in one file, so replacing it touches nothing else', () => {
    expect(files.some((file) => file.endsWith('stub.ts'))).toBe(true);
  });
});
