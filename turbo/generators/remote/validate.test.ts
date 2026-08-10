import { describe, expect, it } from 'vitest';
import {
  HOST_OWNED_ROUTE_PATHS,
  validateLabel,
  validateName,
  validateOutputDirAvailable,
  validateOutputPathOutsideRepo,
  validateRoutePath,
} from './validate';

const EXISTING_APPS = ['shell', 'dashboard', 'admin'] as const;
const EXISTING_ROUTES = ['/dashboard', '/admin'] as const;

describe('validateName', () => {
  it('accepts a legal kebab-case name that does not collide', () => {
    expect(validateName('billing', EXISTING_APPS)).toEqual({ ok: true });
    expect(validateName('user-settings', EXISTING_APPS)).toEqual({ ok: true });
  });

  it('rejects an empty name', () => {
    expect(validateName('', EXISTING_APPS).ok).toBe(false);
  });

  it('rejects invalid name shapes', () => {
    expect(validateName('Billing', EXISTING_APPS).ok).toBe(false); // uppercase
    expect(validateName('1billing', EXISTING_APPS).ok).toBe(false); // leading digit
    expect(validateName('billing_ui', EXISTING_APPS).ok).toBe(false); // underscore
    expect(validateName('billing ui', EXISTING_APPS).ok).toBe(false); // space
    expect(validateName('billing-', EXISTING_APPS).ok).toBe(false); // trailing hyphen
    expect(validateName('billing--ui', EXISTING_APPS).ok).toBe(false); // double hyphen
  });

  it('rejects the reserved "shell" name with a specific reason', () => {
    const result = validateName('shell', []);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/reserved/i);
  });

  it('rejects a name colliding with an existing apps/* directory, naming the collision', () => {
    const result = validateName('admin', EXISTING_APPS);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/apps\/admin/);
  });
});

describe('validateRoutePath', () => {
  it('accepts a route that collides with nothing', () => {
    expect(validateRoutePath('/billing', EXISTING_ROUTES)).toEqual({ ok: true });
  });

  it('requires a leading slash', () => {
    expect(validateRoutePath('billing', EXISTING_ROUTES).ok).toBe(false);
  });

  it('rejects a trailing slash', () => {
    expect(validateRoutePath('/billing/', EXISTING_ROUTES).ok).toBe(false);
  });

  it('rejects a host-owned route path collision (the shell root)', () => {
    expect(HOST_OWNED_ROUTE_PATHS).toContain('/');
    const result = validateRoutePath('/', EXISTING_ROUTES);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/already in use/);
  });

  it('rejects a collision with an existing remote route path (/admin)', () => {
    const result = validateRoutePath('/admin', EXISTING_ROUTES);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/already in use/);
  });

  it('accepts a multi-segment route', () => {
    expect(validateRoutePath('/billing/invoices', EXISTING_ROUTES)).toEqual({ ok: true });
  });

  it('rejects a segment containing characters that could break a generated template', () => {
    // write-app.ts splices routePath raw into a JSDoc comment and JSX text —
    // "*/" would close the comment early, spaces/quotes would break JSX.
    expect(validateRoutePath('/billing*/oops', EXISTING_ROUTES).ok).toBe(false);
    expect(validateRoutePath('/billing oops', EXISTING_ROUTES).ok).toBe(false);
    expect(validateRoutePath('/billing"oops', EXISTING_ROUTES).ok).toBe(false);
  });
});

describe('validateLabel', () => {
  it('accepts a non-empty label', () => {
    expect(validateLabel('Billing')).toEqual({ ok: true });
  });

  it('rejects an empty or whitespace-only label', () => {
    expect(validateLabel('').ok).toBe(false);
    expect(validateLabel('   ').ok).toBe(false);
  });

  it('accepts basic punctuation', () => {
    expect(validateLabel('Billing & Invoices, Inc.')).toEqual({ ok: true });
  });

  it('rejects a label containing characters that could break a generated template', () => {
    // write-app.ts splices label raw into a `label="{{title}}"` JSX
    // attribute and a template literal elsewhere — quotes/backticks/braces
    // would break out of those contexts.
    expect(validateLabel('Billing" onmouseover="x').ok).toBe(false);
    expect(validateLabel('Billing`${process.exit()}`').ok).toBe(false);
    expect(validateLabel('Billing {value}').ok).toBe(false);
  });
});

describe('validateOutputPathOutsideRepo', () => {
  const repoRoot = '/repo';

  it('accepts a sibling directory outside the repo', () => {
    expect(validateOutputPathOutsideRepo('/scratch-standalone', repoRoot)).toEqual({ ok: true });
  });

  it('rejects a path that resolves inside the repo root', () => {
    const result = validateOutputPathOutsideRepo('/repo/apps/scratch', repoRoot);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/inside the monorepo/);
  });

  it('rejects the repo root itself', () => {
    const result = validateOutputPathOutsideRepo('/repo', repoRoot);
    expect(result.ok).toBe(false);
  });

  it('resolves a relative path against the repo root before checking', () => {
    const result = validateOutputPathOutsideRepo('apps/scratch', repoRoot);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/inside the monorepo/);
  });
});

describe('validateOutputDirAvailable', () => {
  it('accepts a target path that does not exist', () => {
    expect(validateOutputDirAvailable('/repo/apps/billing', false)).toEqual({ ok: true });
  });

  it('refuses a target path that already exists, even if empty (no partial-write recovery)', () => {
    const result = validateOutputDirAvailable('/repo/apps/billing', true);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/already exists/);
  });
});
