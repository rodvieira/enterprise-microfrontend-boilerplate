import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EjectTransformError,
  emptyRegistry,
  findRemovedAppHits,
  findReviewHits,
  flattenAdrReferences,
  renameScope,
  rewriteCommitlintScopes,
  rewriteDeployWorkflow,
  rewritePlaywrightWebServers,
  rewriteVitestProjects,
  validateScope,
} from './transforms';

const REPO_ROOT = join(__dirname, '..', '..');
const REMOVED = ['dashboard', 'admin'] as const;

/**
 * The config transforms run against the repo's own real files, not
 * hand-written approximations. A regex that stops matching because one of
 * these files was edited upstream is exactly the failure this suite exists
 * to catch — an approximation would keep passing while the eject broke.
 */
function realFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), 'utf8');
}

describe('validateScope', () => {
  it.each(['@acme', '@my-co', '@a1'])('accepts %s', (scope) => {
    expect(validateScope(scope).ok).toBe(true);
  });

  it.each(['acme', '@Acme', '@', '@acme/ui', '@-acme', '@acme mfe'])('rejects %s', (scope) => {
    expect(validateScope(scope).ok).toBe(false);
  });
});

describe('renameScope', () => {
  it('rewrites package names, imports, and MF shared keys alike', () => {
    const source = [
      `import { Button } from '@enterprise-mfe/ui';`,
      `"name": "@enterprise-mfe/dashboard"`,
      `'@enterprise-mfe/auth': { singleton: true },`,
      '@enterprise-mfe:registry=https://npm.pkg.github.com',
    ].join('\n');

    const renamed = renameScope(source, '@enterprise-mfe', '@acme');

    expect(renamed).not.toContain('@enterprise-mfe');
    expect(renamed).toContain(`from '@acme/ui'`);
    expect(renamed).toContain('"@acme/dashboard"');
    expect(renamed).toContain('@acme:registry=');
  });

  it('leaves an unrelated scope alone', () => {
    expect(renameScope(`import x from '@other/pkg';`, '@enterprise-mfe', '@acme')).toBe(
      `import x from '@other/pkg';`,
    );
  });
});

describe('flattenAdrReferences', () => {
  it('removes a parenthetical citation without disturbing the sentence', () => {
    const { content } = flattenAdrReferences(
      'The registry is fetched at runtime ([ADR-0012](decisions/0012-runtime-registry-fetch.md)). At startup...',
    );
    expect(content).toBe('The registry is fetched at runtime. At startup...');
  });

  it.each([
    ['a remote is deployable on its own (see ADR-0007).', 'a remote is deployable on its own.'],
    ['CSP backs this (sprint 8, ADR-0015) today.', 'CSP backs this today.'],
    [
      'registration — a deployment decision (ADR-0012, FR-010), not a scaffolding one.',
      'registration — a deployment decision, not a scaffolding one.',
    ],
    ['picked up — see ADR-0018.', 'picked up.'],
  ])('strips %j', (input, expected) => {
    expect(flattenAdrReferences(input).content).toBe(expected);
  });

  it('de-links a surviving reference instead of leaving a 404 link', () => {
    const { content, needsReview } = flattenAdrReferences(
      'Per [ADR-0007](decisions/0007-monorepo-and-standalone-parity.md), a remote is portable.',
    );
    expect(content).toBe('Per ADR-0007, a remote is portable.');
    expect(needsReview).toBe(true);
  });

  it('refuses to guess at prose-integrated references, flagging them instead', () => {
    // Stripping this would leave "ADR-0007's claim" as a dangling
    // possessive with no subject — a human has to rewrite the sentence.
    const { content, needsReview } = flattenAdrReferences(
      'ADR-0007\'s "a remote can move to its own repository later" claim.',
    );
    expect(content).toContain('ADR-0007');
    expect(needsReview).toBe(true);
  });

  it('reports nothing to review once every reference is gone', () => {
    expect(flattenAdrReferences('Plain prose with no citation.').needsReview).toBe(false);
  });
});

describe('findReviewHits / findRemovedAppHits', () => {
  it('reports file and 1-indexed line for each surviving reference', () => {
    const hits = findReviewHits('clean line\nsee ADR-0009\nalso clean', 'docs/x.md');
    expect(hits).toEqual([{ file: 'docs/x.md', line: 2, text: 'see ADR-0009' }]);
  });

  it('reports lines still naming a removed app', () => {
    const hits = findRemovedAppHits('the dashboard remote\nunrelated', 'docs/x.md', REMOVED);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.line).toBe(1);
  });

  it('does not flag a removed app name inside a longer word', () => {
    expect(findRemovedAppHits('administrative overhead', 'x.md', ['admin'])).toEqual([]);
  });
});

describe('rewriteVitestProjects', () => {
  const source = realFile('vitest.config.mts');

  it('swaps the example projects for the new remote, keeping the shell', () => {
    const result = rewriteVitestProjects(source, REMOVED, 'payments');
    expect(result).not.toMatch(/browserProject\('dashboard'/);
    expect(result).not.toMatch(/browserProject\('admin'/);
    expect(result).toContain(`browserProject('shell', './apps/shell')`);
    expect(result).toContain(`browserProject('payments', './apps/payments')`);
  });

  it('throws rather than silently no-op when an expected project is absent', () => {
    expect(() => rewriteVitestProjects(source, ['nonexistent'], 'payments')).toThrow(
      EjectTransformError,
    );
  });
});

describe('rewritePlaywrightWebServers', () => {
  const source = realFile('apps/shell/playwright.config.ts');

  it('replaces the two example dev servers with one for the new remote', () => {
    const result = rewritePlaywrightWebServers(source, REMOVED, {
      scope: '@acme',
      name: 'payments',
      port: 3001,
    });
    expect(result).not.toContain('/dashboard dev');
    expect(result).not.toContain('/admin dev');
    expect(result).toContain('--filter @acme/payments dev');
    expect(result).toContain('http://localhost:3001');
    // The shell's own entry survives untouched.
    expect(result).toContain('--filter @enterprise-mfe/shell dev');
    expect(result).toContain('http://localhost:3000');
  });

  it('throws when an expected webServer entry is absent', () => {
    expect(() =>
      rewritePlaywrightWebServers(source, ['nonexistent'], {
        scope: '@acme',
        name: 'payments',
        port: 3001,
      }),
    ).toThrow(EjectTransformError);
  });
});

describe('rewriteCommitlintScopes', () => {
  const source = realFile('commitlint.config.mjs');

  it('swaps the example scopes for the new remote, once', () => {
    const result = rewriteCommitlintScopes(source, REMOVED, 'payments');
    expect(result).not.toMatch(/^\s*'dashboard',$/m);
    expect(result).not.toMatch(/^\s*'admin',$/m);
    expect(result.match(/^\s*'payments',$/gm)).toHaveLength(1);
    expect(result).toMatch(/^\s*'shell',$/m);
  });
});

describe('rewriteDeployWorkflow', () => {
  const source = realFile('.github/workflows/deploy.yml');

  it('builds and assembles the new remote instead of the examples', () => {
    const result = rewriteDeployWorkflow(source, REMOVED, { scope: '@acme', name: 'payments' });

    expect(result).not.toContain('Build dashboard remote');
    expect(result).not.toContain('Build admin remote');
    expect(result).not.toContain('apps/dashboard/dist');
    expect(result).not.toContain('apps/admin/dist');

    expect(result).toContain('- name: Build payments remote');
    expect(result).toContain('run: pnpm --filter @acme/payments run build');
    expect(result).toContain('mkdir -p _site/remotes/payments');
    expect(result).toContain('cp -r apps/payments/dist/. _site/remotes/payments/');
    // The shell's own build and the SPA fallback are untouched.
    expect(result).toContain('Build shell (production)');
    expect(result).toContain('cp apps/shell/dist/index.html _site/404.html');
  });
});

describe('emptyRegistry', () => {
  it('clears remotes and origins for an environment the adopter must define', () => {
    const result = emptyRegistry(
      {
        environment: 'production',
        basePath: '/repo/',
        allowedOrigins: ['https://example.github.io'],
        remotes: [{ name: 'dashboard' }],
      },
      { keepOrigins: false },
    );
    expect(result.remotes).toEqual([]);
    expect(result.allowedOrigins).toEqual([]);
    // basePath named *this* repo's Pages path. Carrying it over would make
    // the ejected shell resolve assets under a stranger's directory name.
    expect(result.basePath).toBeUndefined();
    expect('basePath' in result).toBe(false);
  });

  it('can keep origins, for the dev registry the generator refills', () => {
    const result = emptyRegistry(
      { environment: 'dev', allowedOrigins: ['http://localhost:3001'], remotes: [{}] },
      { keepOrigins: true },
    );
    expect(result.remotes).toEqual([]);
    expect(result.allowedOrigins).toEqual(['http://localhost:3001']);
  });
});
