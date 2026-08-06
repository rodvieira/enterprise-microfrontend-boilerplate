import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ActivityFeedItem } from '../src/internal/data/types';
import { RecentActivity } from '../src/internal/feed/recent-activity';

const FEED: readonly ActivityFeedItem[] = [
  { id: '1', timestamp: '2026-08-06T12:00:00.000Z', description: 'Newest event' },
  { id: '2', timestamp: '2026-08-06T11:00:00.000Z', description: 'Middle event' },
  { id: '3', timestamp: '2026-08-06T10:00:00.000Z', description: 'Oldest event' },
];

function loaded(feed: readonly ActivityFeedItem[]) {
  return { status: 'loaded' as const, data: { kpis: [], activity: [], feed } };
}

describe('RecentActivity', () => {
  it('renders items in the order given (reverse-chronological, FR-012)', () => {
    render(<RecentActivity state={loaded(FEED)} />);
    const rows = screen.getAllByRole('row').slice(1); // drop header row
    expect(rows[0]).toHaveTextContent('Newest event');
    expect(rows[1]).toHaveTextContent('Middle event');
    expect(rows[2]).toHaveTextContent('Oldest event');
  });

  it('shows a distinct empty state when there is no activity (FR-013)', () => {
    render(<RecentActivity state={loaded([])} />);
    expect(screen.getByText('No recent activity.')).toBeInTheDocument();
    expect(screen.queryByText('Newest event')).not.toBeInTheDocument();
  });

  it('shows a distinct loading state before the fetch resolves', () => {
    render(<RecentActivity state={{ status: 'loading' }} />);
    expect(screen.getByText('Loading recent activity…')).toBeInTheDocument();
  });

  it('shows a distinct error state when the fetch failed', () => {
    render(<RecentActivity state={{ status: 'failed', error: new Error('unavailable') }} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Recent activity unavailable.')).toBeInTheDocument();
  });
});
