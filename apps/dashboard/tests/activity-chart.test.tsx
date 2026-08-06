import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ActivityChart } from '../src/internal/chart/activity-chart';
import type { ActivityDataPoint } from '../src/internal/data/types';

const FIXTURE: readonly ActivityDataPoint[] = [
  { timestamp: '2026-07-24T00:00:00.000Z', value: 800 },
  { timestamp: '2026-07-25T00:00:00.000Z', value: 812 },
  { timestamp: '2026-07-26T00:00:00.000Z', value: 790 },
];

function loaded(activity: readonly ActivityDataPoint[]) {
  return { status: 'loaded' as const, data: { kpis: [], activity, feed: [] } };
}

describe('ActivityChart', () => {
  afterEach(() => cleanup());

  it('renders against a real (fixture) time-series data set', () => {
    const { container } = render(<ActivityChart state={loaded(FIXTURE)} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders a defined empty state for zero data points, not an error', () => {
    render(<ActivityChart state={loaded([])} />);
    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
  });

  it('renders a defined state for a single data point, not an error', () => {
    const { container } = render(<ActivityChart state={loaded(FIXTURE.slice(0, 1))} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByText('No activity yet.')).not.toBeInTheDocument();
  });

  it('shows a distinct loading state before the fetch resolves', () => {
    render(<ActivityChart state={{ status: 'loading' }} />);
    expect(screen.getByText('Loading activity…')).toBeInTheDocument();
  });

  it('shows a distinct error state when the fetch failed', () => {
    render(<ActivityChart state={{ status: 'failed', error: new Error('unavailable') }} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Activity chart unavailable.')).toBeInTheDocument();
  });

  it('leaves no chart resources behind after unmount and remount', () => {
    const first = render(<ActivityChart state={loaded(FIXTURE)} />);
    first.unmount();
    expect(document.querySelectorAll('svg')).toHaveLength(0);

    const second = render(<ActivityChart state={loaded(FIXTURE)} />);
    expect(document.querySelectorAll('.recharts-wrapper')).toHaveLength(1);
    second.unmount();
  });
});
