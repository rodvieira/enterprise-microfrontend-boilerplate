import type { DashboardOverview, FetchState, KpiMetric } from '../data/types';
import { KpiCard } from './kpi-card';

/**
 * Both KPIs, known by id even before the fetch resolves, so a
 * loading card can still show its real label instead of a placeholder.
 */
const KPI_ORDER: readonly { id: string; label: string }[] = [
  { id: 'active-users', label: 'Active users' },
  { id: 'usage-trend', label: 'Usage trend' },
];

function formatValue(metric: KpiMetric): string {
  if (metric.id === 'usage-trend') {
    const sign = metric.value > 0 ? '+' : '';
    return `${sign}${metric.value}%`;
  }
  return metric.value.toLocaleString('en-US');
}

export interface KpiCardsProps {
  /**
   * Driven by the single `useDashboardOverview` call in App.tsx — KPI cards,
   * the chart, and the feed all read from one fetch (data-model.md), not
   * three independent ones.
   */
  state: FetchState<DashboardOverview>;
}

export function KpiCards({ state }: KpiCardsProps) {
  const byId = new Map(
    state.status === 'loaded' ? state.data.kpis.map((kpi) => [kpi.id, kpi] as const) : [],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {KPI_ORDER.map(({ id, label }) => {
        if (state.status === 'idle' || state.status === 'loading') {
          return <KpiCard key={id} label={label} status="loading" />;
        }
        if (state.status === 'failed') {
          return <KpiCard key={id} label={label} status="error" />;
        }
        const metric = byId.get(id);
        return metric ? (
          <KpiCard
            key={id}
            label={metric.label}
            status="loaded"
            value={formatValue(metric)}
            trend={metric.trend}
          />
        ) : (
          <KpiCard key={id} label={label} status="error" />
        );
      })}
    </div>
  );
}
