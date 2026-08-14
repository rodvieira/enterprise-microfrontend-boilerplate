import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardOverview, FetchState } from '../data/types';

export interface ActivityChartProps {
  state: FetchState<DashboardOverview>;
}

function formatDay(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-(--radius-surface) border border-(--color-border) p-6 text-sm text-(--color-text-muted)">
      {children}
    </div>
  );
}

/**
 * Renders to inline SVG — no global stylesheet, no canvas registry, nothing
 * to leak into the shell's chrome or any other region.
 */
export function ActivityChart({ state }: ActivityChartProps) {
  if (state.status === 'idle' || state.status === 'loading') {
    return <ChartFrame>Loading activity…</ChartFrame>;
  }

  if (state.status === 'failed') {
    return (
      <div role="alert">
        <ChartFrame>Activity chart unavailable.</ChartFrame>
      </div>
    );
  }

  const { activity } = state.data;

  if (activity.length === 0) {
    return <ChartFrame>No activity yet.</ChartFrame>;
  }

  const chartData = activity.map((point) => ({ ...point, day: formatDay(point.timestamp) }));

  return (
    <div className="h-64 rounded-(--radius-surface) border border-(--color-border) p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" dot={activity.length === 1} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
