import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KpiCards } from '../src/internal/kpi/kpi-cards';

describe('KpiCards', () => {
  it('shows a distinct loading state on both cards (idle/loading)', () => {
    render(<KpiCards state={{ status: 'loading' }} />);

    expect(screen.getByText('Active users')).toBeInTheDocument();
    expect(screen.getByText('Usage trend')).toBeInTheDocument();
    expect(screen.getAllByText('Loading…')).toHaveLength(2);
  });

  it('displays the active-users and usage-trend values once loaded', () => {
    render(
      <KpiCards
        state={{
          status: 'loaded',
          data: {
            kpis: [
              { id: 'active-users', label: 'Active users', value: 1204, trend: 'up' },
              { id: 'usage-trend', label: 'Usage trend', value: 4.2, trend: 'flat' },
            ],
            activity: [],
            feed: [],
          },
        }}
      />,
    );

    expect(screen.getByText('1,204')).toBeInTheDocument();
    expect(screen.getByText('+4.2%')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('shows a distinct error state on both cards when the fetch failed', () => {
    render(<KpiCards state={{ status: 'failed', error: new Error('unavailable') }} />);

    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });
});
