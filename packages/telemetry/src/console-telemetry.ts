import type { RemoteContext, Telemetry } from './types';

/** "dashboard@1.4.2 (/dashboard)", degrading to whatever is actually known. */
function describe(remote: RemoteContext): string {
  const versioned = remote.version ? `${remote.name}@${remote.version}` : remote.name;
  return remote.routePath ? `${versioned} (${remote.routePath})` : versioned;
}

/**
 * The default sink: prints, keeps nothing, sends nothing anywhere.
 *
 * A console implementation rather than a no-op, for the same reason
 * The shell's session module ships a visible stub — on a fresh clone you can watch
 * the instrumentation fire and see exactly which events a real backend would
 * receive, instead of wiring a vendor first to find out whether it works.
 *
 * Successes go to `debug` (filtered out of most consoles by default) and
 * failures to `error`, so the default is informative during development
 * without being noise in a deployed app nobody has swapped it out of yet.
 */
export const consoleTelemetry: Telemetry = {
  remoteLoadStarted(remote) {
    console.debug(`[telemetry] loading ${describe(remote)}…`);
  },
  remoteLoadSucceeded(remote, durationMs) {
    console.debug(`[telemetry] loaded ${describe(remote)} in ${Math.round(durationMs)}ms`);
  },
  remoteLoadFailed(remote, error, durationMs) {
    console.error(
      `[telemetry] ${describe(remote)} failed to load after ${Math.round(durationMs)}ms:`,
      error,
    );
  },
  remoteRenderCrashed(remote, error) {
    console.error(`[telemetry] ${describe(remote)} crashed while rendering:`, error);
  },
};
