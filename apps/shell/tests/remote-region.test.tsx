import { TelemetryProvider } from '@enterprise-mfe/telemetry';
import type { Telemetry } from '@enterprise-mfe/telemetry';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteRegion } from '../src/internal/routes/remote-region';
import { SessionProvider } from '../src/internal/session/context';

vi.mock('@module-federation/enhanced/runtime', () => ({
  loadRemote: vi.fn().mockRejectedValue(new Error('Failed to fetch remote entry')),
}));

describe('RemoteRegion', () => {
  it('contains a load failure to its own region — the rest of the host stays navigable', async () => {
    render(
      <SessionProvider>
        <div>
          <nav>
            <a href="/other">Other page</a>
          </nav>
          <RemoteRegion remoteName="dashboard" basePath="/dashboard" />
          <footer>Shell footer</footer>
        </div>
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('dashboard');
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch remote entry');

    // The rest of the host is completely unaffected by the failed region.
    expect(screen.getByRole('link', { name: 'Other page' })).toBeInTheDocument();
    expect(screen.getByText('Shell footer')).toBeInTheDocument();
  });

  it('reports the load attempt and its failure, naming the build', async () => {
    const telemetry: Telemetry = {
      remoteLoadStarted: vi.fn(),
      remoteLoadSucceeded: vi.fn(),
      remoteLoadFailed: vi.fn(),
      remoteRenderCrashed: vi.fn(),
    };

    render(
      <SessionProvider>
        <TelemetryProvider telemetry={telemetry}>
          <RemoteRegion remoteName="dashboard" basePath="/dashboard" version="1.4.2" />
        </TelemetryProvider>
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    const remote = { name: 'dashboard', routePath: '/dashboard', version: '1.4.2' };
    expect(telemetry.remoteLoadStarted).toHaveBeenCalledWith(remote);
    expect(telemetry.remoteLoadFailed).toHaveBeenCalledWith(
      remote,
      expect.objectContaining({ message: 'Failed to fetch remote entry' }),
      expect.any(Number),
    );
    // A remote that never loaded cannot have crashed while rendering — the
    // two failures are reported separately precisely so a dashboard can
    // tell them apart.
    expect(telemetry.remoteLoadSucceeded).not.toHaveBeenCalled();
    expect(telemetry.remoteRenderCrashed).not.toHaveBeenCalled();
  });
});
