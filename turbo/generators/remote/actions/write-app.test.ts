import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeApp } from './write-app';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

let targetDir: string;

beforeEach(() => {
  targetDir = mkdtempSync(join(tmpdir(), 'write-app-test-'));
});

afterEach(() => {
  rmSync(targetDir, { recursive: true, force: true });
});

function generate(mode: 'monorepo' | 'standalone') {
  return writeApp({
    mode,
    name: 'reports',
    routePath: '/reports',
    label: 'Reports',
    port: 3010,
    repoRoot: REPO_ROOT,
    targetDir,
  });
}

function read(relativePath: string): string {
  return readFileSync(join(targetDir, relativePath), 'utf8');
}

describe('writeApp, standalone mode', () => {
  /**
   * The whole point of the props contract: a remote in its own repository
   * must install nothing from this monorepo. The moment a template
   * reintroduces an @enterprise-mfe dependency, `pnpm install` in a generated
   * project starts requiring a private registry that this repository does not
   * publish to — which is exactly the dead end this design removed.
   */
  it('generates a project that depends on no package from this monorepo', () => {
    generate('standalone');
    const manifest = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const declared = [
      ...Object.keys(manifest.dependencies),
      ...Object.keys(manifest.devDependencies),
    ];
    expect(declared.filter((name) => name.startsWith('@enterprise-mfe/'))).toEqual([]);
  });

  it('imports nothing from this monorepo in any generated source file', () => {
    const { filesCreated } = generate('standalone');
    // Import statements only. Prose may still name a package of ours —
    // contract.ts says which one it mirrors, which is the useful thing to
    // know and costs a generated project nothing.
    const importsOurs = /(?:from|import|@import)\s+['"]@enterprise-mfe\//;
    const offenders = filesCreated
      .filter((path) => /\.(tsx?|css)$/.test(path))
      .filter((path) => importsOurs.test(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('carries its own copy of the contract, since it cannot import one', () => {
    generate('standalone');
    expect(read('src/exposed/App.tsx')).toContain(
      "import type { RemoteAppProps } from '../internal/contract'",
    );
    const contract = read('src/internal/contract.ts');
    for (const name of ['RemoteAppProps', 'RemoteSession', 'RemoteBus']) {
      expect(contract).toContain(`export interface ${name}`);
    }
  });
});

describe('writeApp, monorepo mode', () => {
  it('imports the contract from the workspace package instead of copying it', () => {
    const { filesCreated } = generate('monorepo');
    expect(read('src/exposed/App.tsx')).toContain(
      "import type { RemoteAppProps } from '@enterprise-mfe/shared-types'",
    );
    expect(filesCreated.some((path) => path.endsWith('internal/contract.ts'))).toBe(false);
  });

  it('declares shared-types as its only workspace dependency', () => {
    generate('monorepo');
    const manifest = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
    };
    expect(
      Object.keys(manifest.dependencies).filter((n) => n.startsWith('@enterprise-mfe/')),
    ).toEqual(['@enterprise-mfe/shared-types']);
  });
});

describe('writeApp, either mode', () => {
  it.each(['monorepo', 'standalone'] as const)(
    'gives %s mode local stand-ins for the props a host would supply',
    (mode) => {
      generate(mode);
      expect(read('src/bootstrap.tsx')).toContain(
        "import { standaloneBus, standaloneSession } from './internal/standalone-host'",
      );
      expect(read('src/bootstrap.tsx')).toContain('session={standaloneSession}');
      expect(read('src/bootstrap.tsx')).toContain('bus={standaloneBus}');
    },
  );

  it.each(['monorepo', 'standalone'] as const)(
    'shares only react, react-dom and react-router from %s mode',
    (mode) => {
      generate(mode);
      const config = read('rspack.config.ts');
      const shared = config.slice(config.indexOf('shared: {'));
      expect(shared).not.toContain('@enterprise-mfe/');
    },
  );
});
