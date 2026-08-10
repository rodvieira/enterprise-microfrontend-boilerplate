import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  REQUIRED_SINGLETONS,
  REQUIRED_TOOL_VERSIONS,
  readSharedVersions,
  readToolVersions,
} from './shared-versions';

const REPO_ROOT = join(__dirname, '..', '..', '..');

describe('readSharedVersions', () => {
  it('matches apps/dashboard/package.json exactly for every required singleton', () => {
    const dashboardManifest = JSON.parse(
      readFileSync(join(REPO_ROOT, 'apps/dashboard/package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };

    const versions = readSharedVersions(REPO_ROOT);

    for (const name of REQUIRED_SINGLETONS) {
      expect(versions[name]).toBe(dashboardManifest.dependencies[name]);
    }
  });

  it('fails loudly when a required singleton is missing from the source manifest', () => {
    // A dashboard-shaped manifest missing one singleton. Written to a temp
    // repo root so this test never touches the real apps/dashboard.
    const tempRoot = mkdtempSync(join(tmpdir(), 'shared-versions-test-'));
    try {
      mkdirSync(join(tempRoot, 'apps/dashboard'), { recursive: true });
      writeFileSync(
        join(tempRoot, 'apps/dashboard/package.json'),
        JSON.stringify({
          dependencies: {
            react: '^19.2.8',
            'react-dom': '^19.2.8',
            'react-router': '^8.3.0',
            '@enterprise-mfe/auth': 'workspace:*',
            // '@enterprise-mfe/event-bus' deliberately omitted
          },
        }),
      );
      expect(() => readSharedVersions(tempRoot)).toThrowError(/@enterprise-mfe\/event-bus/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("stays in sync with scripts/check-shared-deps.ts's SINGLETONS list", () => {
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

    expect(new Set(listedNames)).toEqual(new Set(REQUIRED_SINGLETONS));
  });
});

describe('readToolVersions', () => {
  it('matches apps/dashboard/package.json exactly for every required tool', () => {
    const dashboardManifest = JSON.parse(
      readFileSync(join(REPO_ROOT, 'apps/dashboard/package.json'), 'utf8'),
    ) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    const merged = { ...dashboardManifest.dependencies, ...dashboardManifest.devDependencies };

    const versions = readToolVersions(REPO_ROOT);

    for (const name of REQUIRED_TOOL_VERSIONS) {
      expect(versions[name]).toBe(merged[name]);
    }
  });

  it('fails loudly when a required tool version is missing from the source manifest', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'tool-versions-test-'));
    try {
      mkdirSync(join(tempRoot, 'apps/dashboard'), { recursive: true });
      writeFileSync(
        join(tempRoot, 'apps/dashboard/package.json'),
        JSON.stringify({ dependencies: {}, devDependencies: {} }),
      );
      expect(() => readToolVersions(tempRoot)).toThrowError(/@rspack\/cli/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
