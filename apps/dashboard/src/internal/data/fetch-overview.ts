import { ACTIVITY_FIXTURES, FEED_FIXTURES, KPI_FIXTURES } from './fixtures';
import type { DashboardOverview } from './types';

export interface FetchOverviewOptions {
  /** Milliseconds of artificial delay before resolving. Default 400. */
  delayMs?: number;
  /** Forces the rejection path, so the error state is testable. Default false. */
  forceFailure?: boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The dashboard's own async data source (contracts/dashboard-data-contract.md).
 * No network call — this project has no backend. Returns a
 * fresh, independently-ordered copy on every call, never mutated in place.
 */
export async function fetchDashboardOverview(
  options: FetchOverviewOptions = {},
): Promise<DashboardOverview> {
  const { delayMs = 400, forceFailure = false } = options;
  await delay(delayMs);

  if (forceFailure) {
    throw new Error('fetchDashboardOverview: the overview data source is unavailable.');
  }

  return {
    kpis: KPI_FIXTURES.map((kpi) => ({ ...kpi })),
    activity: ACTIVITY_FIXTURES.map((point) => ({ ...point })),
    feed: FEED_FIXTURES.map((item) => ({ ...item })),
  };
}

export type { DashboardOverview, ActivityDataPoint, ActivityFeedItem, KpiMetric } from './types';
