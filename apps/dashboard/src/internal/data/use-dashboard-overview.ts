import { useEffect, useState } from 'react';
import { fetchDashboardOverview } from './fetch-overview';
import type { FetchOverviewOptions } from './fetch-overview';
import type { DashboardOverview, FetchState } from './types';

function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(JSON.stringify(reason));
}

/**
 * Thin hook wrapping fetch-overview.ts in a FetchState
 * (idle → loading → loaded | failed, data-model.md), reused by all three
 * domain surfaces so they move through loading/error together (FR-008).
 */
export function useDashboardOverview(
  options?: FetchOverviewOptions,
): FetchState<DashboardOverview> {
  const [state, setState] = useState<FetchState<DashboardOverview>>({ status: 'idle' });

  // biome-ignore lint/correctness/useExhaustiveDependencies: options is a plain object literal at call sites; re-fetching on every render's new identity is not the intent — fetch once per mount.
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetchDashboardOverview(options)
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'loaded', data });
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setState({ status: 'failed', error: toError(reason) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
