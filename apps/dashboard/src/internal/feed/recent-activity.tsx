import type { ActivityFeedItem, DashboardOverview, FetchState } from '../data/types';
import { Table } from '../ui/table';
import type { TableColumn } from '../ui/table';

export interface RecentActivityProps {
  state: FetchState<DashboardOverview>;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const COLUMNS: readonly TableColumn<ActivityFeedItem>[] = [
  { key: 'description', header: 'Activity', cell: (item) => item.description },
  { key: 'timestamp', header: 'When', cell: (item) => formatTimestamp(item.timestamp) },
];

/**
 * Renders exactly what it's given, newest first — bounding to at
 * most 12 items is fetch-overview.ts's responsibility
 * (contracts/dashboard-data-contract.md), not this component's.
 */
export function RecentActivity({ state }: RecentActivityProps) {
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <Table
        columns={COLUMNS}
        rows={[]}
        getRowId={(item) => item.id}
        emptyState={<span>Loading recent activity…</span>}
      />
    );
  }

  if (state.status === 'failed') {
    return (
      <div role="alert">
        <Table
          columns={COLUMNS}
          rows={[]}
          getRowId={(item) => item.id}
          emptyState={<span>Recent activity unavailable.</span>}
        />
      </div>
    );
  }

  return (
    <Table
      columns={COLUMNS}
      rows={state.data.feed}
      getRowId={(item) => item.id}
      emptyState={<span>No recent activity.</span>}
      caption="Recent activity"
    />
  );
}
