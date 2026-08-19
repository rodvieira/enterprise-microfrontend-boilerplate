import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  REQUIRED_SINGLETONS,
  REQUIRED_TOOL_VERSIONS,
  readSharedVersions,
  readToolVersions,
  resolveSourceManifest,
} from './shared-versions';

const REPO_ROOT = join(__dirname, '..', '..', '..');

/** A manifest that satisfies resolveSourceManifest, for tests that need one. */
const COMPLETE_SINGLETONS: Record<string, string> = {
  react: '^19.2.8',
  'react-dom': '^19.2.8',
  'react-router': '^8.3.0',
};

describe('resolveSourceManifest', () => {
  it('resolves to a real remote in this repo, never the shell', () => {
    const resolved = resolveSourceManifest(REPO_ROOT);
    expect(resolved).toMatch(/^apps\/.+\/package\.json$/);
    expect(resolved).not.toContain('apps/shell');
  });

  it('picks the first qualifying remote alphabetically, so it is deterministic', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'resolve-source-test-'));
    try {
      for (const name of ['zebra', 'alpha']) {
        mkdirSync(join(tempRoot, 'apps', name), { recursive: true });
        writeFileSync(
          join(tempRoot, 'apps', name, 'package.json'),
          JSON.stringify({ dependencies: COMPLETE_SINGLETONS }),
        );
      }
      expect(resolveSourceManifest(tempRoot)).toBe(join('apps', 'alpha', 'package.json'));
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('skips the shell even when it is the only app present', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'resolve-source-test-'));
    try {
      mkdirSync(join(tempRoot, 'apps/shell'), { recursive: true });
      writeFileSync(
        join(tempRoot, 'apps/shell/package.json'),
        JSON.stringify({ dependencies: COMPLETE_SINGLETONS }),
      );
      expect(() => resolveSourceManifest(tempRoot)).toThrowError(/no remote under apps\//);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

describe('readSharedVersions', () => {
  it('matches the resolved source manifest exactly for every required singleton', () => {
    const sourceManifest = JSON.parse(
      readFileSync(join(REPO_ROOT, resolveSourceManifest(REPO_ROOT)), 'utf8'),
    ) as { dependencies: Record<string, string> };

    const versions = readSharedVersions(REPO_ROOT);

    for (const name of REQUIRED_SINGLETONS) {
      expect(versions[name]).toBe(sourceManifest.dependencies[name]);
    }
  });

  it('names the missing singleton when no remote declares the full set', () => {
    // A remote-shaped manifest missing one singleton. Written to a temp repo
    // root so this test never touches the real apps/.
    const tempRoot = mkdtempSync(join(tmpdir(), 'shared-versions-test-'));
    try {
      const { 'react-router': _omitted, ...incomplete } = COMPLETE_SINGLETONS;
      mkdirSync(join(tempRoot, 'apps/dashboard'), { recursive: true });
      writeFileSync(
        join(tempRoot, 'apps/dashboard/package.json'),
        JSON.stringify({ dependencies: incomplete }),
      );
      expect(() => readSharedVersions(tempRoot)).toThrowError(/react-router/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('never hands out a version scripts/check-shared-deps.ts does not guard', () => {
    const source = readFileSync(join(REPO_ROOT, 'scripts/check-shared-deps.ts'), 'utf8');
    const match = source.match(/const SINGLETONS = \[([\s\S]*?)\] as const;/);
    expect(match).not.toBeNull();
    // Only lines that are themselves a quoted array entry (ignoring
    // comment-only lines, some of which contain apostrophes of their own,
    // e.g. "admin's role-change events").
    const listedNames = (match?.[1] ?? '')
      .split('\n')
      .map((line) => line.trim().match(/^'([^']+)',?$/))
      .filter((entryMatch): entryMatch is RegExpMatchArray => entryMatch !== null)
      .map((entryMatch) => entryMatch[1]);

    // A subset, not an exact match. The two lists answer different
    // questions: check-shared-deps.ts guards *anything* that must agree
    // wherever it is declared, while REQUIRED_SINGLETONS is what a
    // generated remote is given a version of. A singleton no remote needs
    // by default — @enterprise-mfe/telemetry, which the host installs and a
    // remote only opts into — belongs in the first list and not the second.
    //
    // The dangerous direction is the one asserted here: a version the
    // generator hands out that nothing checks for drift would reintroduce
    // exactly the silent runtime failure both lists exist to prevent.
    const guarded = new Set(listedNames);
    const unguarded = REQUIRED_SINGLETONS.filter((name) => !guarded.has(name));
    expect(unguarded).toEqual([]);
  });
});

describe('readToolVersions', () => {
  it('matches the resolved source manifest exactly for every required tool', () => {
    const sourceManifest = JSON.parse(
      readFileSync(join(REPO_ROOT, resolveSourceManifest(REPO_ROOT)), 'utf8'),
    ) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    const merged = { ...sourceManifest.dependencies, ...sourceManifest.devDependencies };

    const versions = readToolVersions(REPO_ROOT);

    for (const name of REQUIRED_TOOL_VERSIONS) {
      expect(versions[name]).toBe(merged[name]);
    }
  });

  it('fails loudly when a required tool version is missing from the source manifest', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'tool-versions-test-'));
    try {
      // Singletons complete (so the manifest resolves), tooling absent — the
      // case this test is actually about.
      mkdirSync(join(tempRoot, 'apps/dashboard'), { recursive: true });
      writeFileSync(
        join(tempRoot, 'apps/dashboard/package.json'),
        JSON.stringify({ dependencies: COMPLETE_SINGLETONS, devDependencies: {} }),
      );
      expect(() => readToolVersions(tempRoot)).toThrowError(/@rspack\/cli/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
