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
  const sources = ["'self'", ...new Set(allowedOrigins)];
  return `script-src ${sources.join(' ')}`;
}
