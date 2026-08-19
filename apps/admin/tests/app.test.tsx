import type { RemoteBus, RemoteSession, User } from '@enterprise-mfe/shared-types';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/exposed/App';

/**
 * A remote receives everything from its host as props, so its tests supply
 * those props directly — no provider to wrap it in, no package to mock.
 * That is the same position a team in another repository is in.
 */
function makeBus(): RemoteBus {
  return { publish: vi.fn(), subscribe: vi.fn(() => () => {}) };
}

const SIGNED_OUT: RemoteSession = { user: null, isAuthenticated: false };

const ADA: User = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'admin',
  permissions: ['users:read', 'users:write', 'dashboard:read'],
};

describe('App', () => {
  it('renders standalone, given a basePath, with no host present', async () => {
    render(<App basePath="/admin" session={SIGNED_OUT} bus={makeBus()} />);
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Not signed in')).toBeInTheDocument());
  });

  it('reflects the session the host handed it', async () => {
    render(
      <App basePath="/admin" session={{ user: ADA, isAuthenticated: true }} bus={makeBus()} />,
    );
    await waitFor(() => expect(screen.getByText('Signed in as Ada Lovelace')).toBeInTheDocument());
  });

  it('publishes a role change onto the host bus, not into a package of its own', async () => {
    const bus = makeBus();
    render(<App basePath="/admin" session={{ user: ADA, isAuthenticated: true }} bus={bus} />);

    // The write action is only offered to a session carrying users:write.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Invite or edit user' })).toBeInTheDocument(),
    );
    expect(bus.publish).not.toHaveBeenCalled();
  });
});
