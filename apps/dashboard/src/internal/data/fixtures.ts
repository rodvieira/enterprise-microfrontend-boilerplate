import type { ActivityDataPoint, ActivityFeedItem, KpiMetric } from './types';

/** In-module fixture data — this project has no backend. */

export const KPI_FIXTURES: readonly KpiMetric[] = [
  { id: 'active-users', label: 'Active users', value: 1204, trend: 'up' },
  { id: 'usage-trend', label: 'Usage trend', value: 4.2, trend: 'flat' },
];

/** Chronological, oldest first — the order a chart plots left to right. */
export const ACTIVITY_FIXTURES: readonly ActivityDataPoint[] = Array.from(
  { length: 14 },
  (_, index) => ({
    timestamp: new Date(Date.UTC(2026, 6, 24 + index)).toISOString(),
    value: 800 + Math.round(Math.sin(index / 2) * 120) + index * 6,
  }),
);

const FEED_DESCRIPTIONS: readonly string[] = [
  'Ada Lovelace signed in',
  'Grace Hopper exported the monthly report',
  'A new remote registered with the shell',
  'Margaret Hamilton updated her profile',
  'Katherine Johnson invited a teammate',
  'Radia Perlman archived a project',
  'Ada Lovelace signed out',
  'Grace Hopper viewed the activity feed',
  'A scheduled export completed',
  'Margaret Hamilton left a comment',
  'Katherine Johnson approved a request',
  'Radia Perlman signed in',
];

/** Reverse-chronological (newest first) and bounded at 12 items. */
export const FEED_FIXTURES: readonly ActivityFeedItem[] = FEED_DESCRIPTIONS.map(
  (description, index) => ({
    id: `activity-${index}`,
    timestamp: new Date(Date.UTC(2026, 7, 6, 12 - index)).toISOString(),
    description,
  }),
);
