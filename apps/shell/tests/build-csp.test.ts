import { describe, expect, it } from 'vitest';
import { buildScriptSrc } from '../src/internal/federation/build-csp';

describe('buildScriptSrc', () => {
  it('includes only "self" when there are no allowed origins', () => {
    expect(buildScriptSrc([])).toBe("script-src 'self'");
  });

  it('appends a single allowed origin after "self"', () => {
    expect(buildScriptSrc(['http://localhost:3001'])).toBe(
      "script-src 'self' http://localhost:3001",
    );
  });

  it('appends every allowed origin, in the order given', () => {
    expect(buildScriptSrc(['http://localhost:3001', 'http://localhost:3002'])).toBe(
      "script-src 'self' http://localhost:3001 http://localhost:3002",
    );
  });

  it('de-duplicates a repeated origin rather than listing it twice', () => {
    expect(buildScriptSrc(['https://dashboard.example', 'https://dashboard.example'])).toBe(
      "script-src 'self' https://dashboard.example",
    );
  });

  it('fails loudly on a malformed allowedOrigins instead of silently shipping "self"-only', () => {
    // A registry file with a typo'd/missing "allowedOrigins" key must not
    // silently produce a CSP nobody chose — the same discipline
    // resolve-registry-source.ts applies to a missing file.
    expect(() => buildScriptSrc(undefined as unknown as string[])).toThrow(TypeError);
    expect(() => buildScriptSrc(null as unknown as string[])).toThrow(TypeError);
  });
});
