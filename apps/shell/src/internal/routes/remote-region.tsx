import { RemoteBoundary, useRemote } from '@enterprise-mfe/federation-utils';
import type { RemoteLoader } from '@enterprise-mfe/federation-utils';
import type { RemoteAppProps } from '@enterprise-mfe/shared-types';
import type { RemoteContext, Telemetry } from '@enterprise-mfe/telemetry';
import { useTelemetry } from '@enterprise-mfe/telemetry';
import { Button } from '@enterprise-mfe/ui';
import { useCallback, useMemo } from 'react';
import { createFederationLoader } from '../federation/loader';

export interface RemoteRegionProps {
  /** The registered remote's name, matching what registerRemotes was given. */
  remoteName: string;
  /** Passed to the remote's exposed root component. */
  basePath: string;
  /** From the registry, when it states one. Reported with every event. */
  version?: string;
}

/**
 * Wraps a loader so the load is timed and reported.
 *
 * This lives in the shell rather than inside useRemote because
 * @enterprise-mfe/federation-utils deliberately depends on nothing — adding
 * telemetry there would make every consumer of that package take the
 * telemetry contract too. Wrapping the loader keeps the instrumentation
 * where the context (which remote, which version) actually is.
 */
function instrumented<T>(
  loader: RemoteLoader<T>,
  telemetry: Telemetry,
  remote: RemoteContext,
): RemoteLoader<T> {
  return async () => {
    const startedAt = performance.now();
    telemetry.remoteLoadStarted(remote);
    try {
      const module = await loader();
      telemetry.remoteLoadSucceeded(remote, performance.now() - startedAt);
      return module;
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      telemetry.remoteLoadFailed(remote, error, performance.now() - startedAt);
      throw error;
    }
  };
}

/**
 * One federated region: composes useRemote (the load state machine) with
 * RemoteBoundary (catches a throw during the remote's own render) — the two
 * failure surfaces named in the spec are different, so both are wired, and
 * both are reported separately for the same reason.
 *
 * Every remote exposes its root under "./App" by convention (documented in
 * the registry contract) — this is the one place that convention is assumed.
 */
export function RemoteRegion({ remoteName, basePath, version }: RemoteRegionProps) {
  const telemetry = useTelemetry();

  const remote = useMemo<RemoteContext>(
    () => ({ name: remoteName, routePath: basePath, ...(version ? { version } : {}) }),
    [remoteName, basePath, version],
  );

  const loader = useMemo(
    () =>
      instrumented(createFederationLoader<RemoteAppProps>(`${remoteName}/App`), telemetry, remote),
    [remoteName, telemetry, remote],
  );

  const onRenderError = useCallback(
    (error: Error) => telemetry.remoteRenderCrashed(remote, error),
    [telemetry, remote],
  );

  const { Component, state, error, retry } = useRemote(loader);

  if (state === 'idle' || state === 'loading') {
    return <p>Loading {remoteName}…</p>;
  }

  if (state === 'failed' || !Component) {
    return (
      <p role="alert">
        Failed to load "{remoteName}": {error?.message}.{' '}
        <Button type="button" size="sm" variant="secondary" onClick={retry}>
          Retry
        </Button>
      </p>
    );
  }

  return (
    <RemoteBoundary
      onError={onRenderError}
      fallback={(renderError, renderRetry) => (
        <p role="alert">
          "{remoteName}" failed while rendering: {renderError.message}.{' '}
          <Button type="button" size="sm" variant="secondary" onClick={renderRetry}>
            Retry
          </Button>
        </p>
      )}
    >
      <Component basePath={basePath} />
    </RemoteBoundary>
  );
}
