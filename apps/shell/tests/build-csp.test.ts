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
});
