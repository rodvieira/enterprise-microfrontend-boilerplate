/**
 * The host-owned route → remote mapping (research D9).
 *
 * A remote does not register its own routes into the host — that would
 * require the host to execute remote code before origin-guard.ts has decided
 * whether that code may run at all, inverting the security boundary FR-016
 * establishes. Instead, this list is populated from the validated registry at
 * startup and handed to react-router as ordinary route objects.
 *
 * Starts empty: no remote exists until sprint 4. The paths here are also what
 * fetchRegistry() checks incoming registrations against for a routePath
 * collision (manifest.ts, assertNoRoutePathCollisions).
 */
export const HOST_OWNED_ROUTE_PATHS: readonly string[] = ['/'];
