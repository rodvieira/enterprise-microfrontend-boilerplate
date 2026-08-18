import { describe, expect, it } from 'vitest';
import { judgeOrigin } from '../src/internal/federation/origin-guard';

const SHELL_ORIGIN = 'https://shell.example';

describe('judgeOrigin', () => {
  it('refuses an origin absent from allowedOrigins', () => {
    const decision = judgeOrigin(
      'https://evil.example/mf-manifest.json',
      ['https://dashboard.example'],
      SHELL_ORIGIN,
    );
    expect(decision).toEqual({
      allowed: false,
      reason: 'origin-not-allowed',
      origin: 'https://evil.example',
    });
  });

  it('refuses insecure transport on a non-loopback origin', () => {
    const decision = judgeOrigin(
      'http://dashboard.example/mf-manifest.json',
      ['http://dashboard.example'],
      SHELL_ORIGIN,
    );
    expect(decision).toEqual({
      allowed: false,
      reason: 'insecure-transport',
      origin: 'http://dashboard.example',
    });
  });

  it('allows insecure transport on loopback — local development must keep working', () => {
    const decision = judgeOrigin(
      'http://localhost:3001/mf-manifest.json',
      ['http://localhost:3001'],
      SHELL_ORIGIN,
    );
    expect(decision).toEqual({
      allowed: true,
      reason: 'ok',
      origin: 'http://localhost:3001',
    });
  });

  it('allows insecure transport on 127.0.0.1, the other common loopback form', () => {
    const decision = judgeOrigin(
      'http://127.0.0.1:3001/mf-manifest.json',
      ['http://127.0.0.1:3001'],
      SHELL_ORIGIN,
    );
    expect(decision.allowed).toBe(true);
  });

  it('refuses an entry that is not a valid URL', () => {
    const decision = judgeOrigin('not a url', ['http://localhost:3001'], SHELL_ORIGIN);
    expect(decision).toEqual({
      allowed: false,
      reason: 'malformed-url',
      origin: '',
    });
  });

  it('allows a secure origin that is on the allow-list', () => {
    const decision = judgeOrigin(
      'https://dashboard.example/mf-manifest.json',
      ['https://dashboard.example'],
      SHELL_ORIGIN,
    );
    expect(decision).toEqual({
      allowed: true,
      reason: 'ok',
      origin: 'https://dashboard.example',
    });
  });
});

describe('judgeOrigin — same-origin entries', () => {
  it('allows a root-relative entry without any allow-list entry', () => {
    // It is the origin already executing the shell's own code; listing it
    // would be a check that cannot meaningfully fail.
    const decision = judgeOrigin('/remotes/dashboard/mf-manifest.json', [], SHELL_ORIGIN);
    expect(decision).toEqual({ allowed: true, reason: 'ok', origin: SHELL_ORIGIN });
  });

  it('allows an absolute entry naming the shellitself, with no allow-list entry', () => {
    const decision = judgeOrigin(
      `${SHELL_ORIGIN}/remotes/admin/mf-manifest.json`,
      [],
      SHELL_ORIGIN,
    );
    expect(decision.allowed).toBe(true);
  });

  it('allows a same-origin entry even over plain http, where a third party would be refused', () => {
    // The shell's own code already arrived over this scheme, so refusing its
    // remote for using it protects nothing.
    const insecureShell = 'http://internal-host';
    expect(judgeOrigin('/remotes/dashboard/mf-manifest.json', [], insecureShell).allowed).toBe(
      true,
    );
    expect(
      judgeOrigin(`${insecureShell}/remotes/dashboard/mf-manifest.json`, [], insecureShell).allowed,
    ).toBe(true);
    expect(judgeOrigin('http://third-party.example/x.json', [], insecureShell).allowed).toBe(false);
  });

  it('still judges a protocol-relative entry as the other origin it really names', () => {
    // "//evil.example/x" looks relative and is not.
    const decision = judgeOrigin('//evil.example/mf-manifest.json', [], SHELL_ORIGIN);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('origin-not-allowed');
    expect(decision.origin).toBe('https://evil.example');
  });

  it('does not let a base URL rescue a malformed entry', () => {
    // Resolving against selfOrigin would turn this into
    // "https://shell.example/not%20a%20url" and allow it.
    expect(judgeOrigin('not a url', [], SHELL_ORIGIN)).toEqual({
      allowed: false,
      reason: 'malformed-url',
      origin: '',
    });
  });
});
