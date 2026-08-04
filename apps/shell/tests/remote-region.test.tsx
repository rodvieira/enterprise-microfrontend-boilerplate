import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteRegion } from '../src/internal/routes/remote-region';

vi.mock('@module-federation/enhanced/runtime', () => ({
  loadRemote: vi.fn().mockRejectedValue(new Error('Failed to fetch remote entry')),
}));

describe('RemoteRegion', () => {
  it('contains a load failure to its own region — the rest of the host stays navigable (FR-012)', async () => {
    render(
      <div>
        <nav>
          <a href="/other">Other page</a>
        </nav>
        <RemoteRegion remoteName="dashboard" basePath="/dashboard" />
        <footer>Shell footer</footer>
      </div>,
    );

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('dashboard');
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch remote entry');

    // The rest of the host is completely unaffected by the failed region.
    expect(screen.getByRole('link', { name: 'Other page' })).toBeInTheDocument();
    expect(screen.getByText('Shell footer')).toBeInTheDocument();
  });
});
