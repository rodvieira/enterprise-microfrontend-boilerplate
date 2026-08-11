/**
 * Derives the shell's Content-Security-Policy `script-src` directive from
 * the same `allowedOrigins` list `origin-guard.ts` already enforces at the
 * application level for the active environment — never a second,
 * independently-maintained value (specs/007-docs-security FR-004).
 *
 * A pure function of `allowedOrigins`, mirroring
 * `resolve-registry-source.ts`'s own "pure function, unit-tested directly"
 * pattern: `rspack.config.ts` calls this with the real, already-resolved
 * registry's `allowedOrigins`; tests call it with a fixed array.
 */
export function buildScriptSrc(allowedOrigins: readonly string[]): string {
  // A malformed/missing allowedOrigins (e.g. a registry file with a typo'd
  // key) must fail loudly, the same discipline resolve-registry-source.ts
  // applies to a missing file — silently degrading to `script-src 'self'`
  // would ship a CSP nobody chose, indistinguishable from every remote
  // having been deliberately removed.
  if (!Array.isArray(allowedOrigins)) {
    throw new TypeError(
      `buildScriptSrc: expected allowedOrigins to be an array, got ${typeof allowedOrigins}.`,
    );
  }
  const sources = ["'self'", ...new Set(allowedOrigins)];
  return `script-src ${sources.join(' ')}`;
}
