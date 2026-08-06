/** Shapes match data-model.md exactly. Internal to the dashboard remote. */

export type KpiTrend = 'up' | 'down' | 'flat';

export interface KpiMetric {
  id: string;
  label: string;
  value: number;
  trend: KpiTrend;
}

export interface ActivityDataPoint {
  timestamp: string;
  value: number;
}

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  description: string;
}

export interface DashboardOverview {
  kpis: readonly KpiMetric[];
  activity: readonly ActivityDataPoint[];
  feed: readonly ActivityFeedItem[];
}

export type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: T }
  | { status: 'failed'; error: Error };
