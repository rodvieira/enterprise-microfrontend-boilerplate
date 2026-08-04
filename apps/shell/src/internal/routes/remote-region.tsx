import { RemoteBoundary, useRemote } from '@enterprise-mfe/federation-utils';
import type { RemoteAppProps } from '@enterprise-mfe/shared-types';
import { createFederationLoader } from '../federation/loader';

export interface RemoteRegionProps {
  /** The registered remote's name, matching what registerRemotes was given. */
  remoteName: string;
  /** Passed to the remote's exposed root component. */
  basePath: string;
}

/**
 * One federated region: composes useRemote (the load state machine) with
 * RemoteBoundary (catches a throw during the remote's own render) — the two
 * failure surfaces named in the spec are different, so both are wired.
 *
 * Every remote exposes its root under "./App" by convention (documented in
 * the registry contract) — this is the one place that convention is assumed.
 */
export function RemoteRegion({ remoteName, basePath }: RemoteRegionProps) {
  const loader = createFederationLoader<RemoteAppProps>(`${remoteName}/App`);
  const { Component, state, error, retry } = useRemote(loader);

  if (state === 'idle' || state === 'loading') {
    return <p>Loading {remoteName}…</p>;
  }

  if (state === 'failed' || !Component) {
    return (
      <p role="alert">
        Failed to load "{remoteName}": {error?.message}.{' '}
        <button type="button" onClick={retry}>
          Retry
        </button>
      </p>
    );
  }

  return (
    <RemoteBoundary
      fallback={(renderError, renderRetry) => (
        <p role="alert">
          "{remoteName}" failed while rendering: {renderError.message}.{' '}
          <button type="button" onClick={renderRetry}>
            Retry
          </button>
        </p>
      )}
    >
      <Component basePath={basePath} />
    </RemoteBoundary>
  );
}
