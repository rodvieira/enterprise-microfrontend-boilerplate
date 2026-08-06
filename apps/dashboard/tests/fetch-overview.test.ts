import { describe, expect, it } from 'vitest';
import { fetchDashboardOverview } from '../src/internal/data/fetch-overview';

describe('fetchDashboardOverview', () => {
  it('resolves a DashboardOverview with exactly 2 kpis', async () => {
    const overview = await fetchDashboardOverview({ delayMs: 0 });
    expect(overview.kpis).toHaveLength(2);
    expect(overview.kpis.map((kpi) => kpi.id).sort()).toEqual(['active-users', 'usage-trend']);
  });

  it('resolves feed items reverse-chronological and bounded at 12', async () => {
    const overview = await fetchDashboardOverview({ delayMs: 0 });
    expect(overview.feed.length).toBeLessThanOrEqual(12);
    const timestamps = overview.feed.map((item) => new Date(item.timestamp).getTime());
    const sortedDescending = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sortedDescending);
  });

  it('resolves activity points in chronological order', async () => {
    const overview = await fetchDashboardOverview({ delayMs: 0 });
    const timestamps = overview.activity.map((point) => new Date(point.timestamp).getTime());
    const sortedAscending = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sortedAscending);
  });

  it('never mutates its returned arrays between calls', async () => {
    const first = await fetchDashboardOverview({ delayMs: 0 });
    const firstKpi = first.kpis[0];
    expect(firstKpi).toBeDefined();
    if (firstKpi) {
      firstKpi.value = -1;
    }
    const second = await fetchDashboardOverview({ delayMs: 0 });
    expect(second.kpis[0]?.value).not.toBe(-1);
  });

  it('rejects with a specific, non-generic message when forceFailure is set', async () => {
    await expect(fetchDashboardOverview({ delayMs: 0, forceFailure: true })).rejects.toThrow(
      /overview data source is unavailable/,
    );
  });
});
