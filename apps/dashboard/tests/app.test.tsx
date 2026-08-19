import type { RemoteBus, RemoteSession, User } from '@enterprise-mfe/shared-types';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/exposed/App';

/**
 * A remote receives everything from its host as props, so its tests supply
 * those props directly. There is no provider to wrap it in and no package to
 * mock — which is the same position a team in another repository is in.
 */
function makeBus(): RemoteBus & { emit: (topic: string, payload: unknown) => void } {
  const subscribers = new Map<string, Set<(payload: unknown) => void>>();
  return {
    publish(topic, payload) {
      for (const handler of subscribers.get(topic) ?? []) handler(payload);
    },
    subscribe(topic, handler) {
      const handlers = subscribers.get(topic) ?? new Set();
      handlers.add(handler);
      subscribers.set(topic, handlers);
      return () => handlers.delete(handler);
    },
    emit(topic, payload) {
      for (const handler of subscribers.get(topic) ?? []) handler(payload);
    },
  };
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
    render(<App basePath="/dashboard" session={SIGNED_OUT} bus={makeBus()} />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Not signed in')).toBeInTheDocument());
  });

  it('reflects the session the host handed it', async () => {
    render(
      <App basePath="/dashboard" session={{ user: ADA, isAuthenticated: true }} bus={makeBus()} />,
    );
    await waitFor(() => expect(screen.getByText('Signed in as Ada Lovelace')).toBeInTheDocument());
  });

  it("increments the active-users KPI on the host bus's user:role-changed", async () => {
    const bus = makeBus();
    render(<App basePath="/dashboard" session={SIGNED_OUT} bus={bus} />);
    await waitFor(() => expect(screen.getByText('1,204')).toBeInTheDocument());

    bus.emit('user:role-changed', { userId: 'user-1', newRole: 'editor' });

    await waitFor(() => expect(screen.getByText('1,205')).toBeInTheDocument());
  });

  it('ignores a malformed payload rather than trusting what crossed the boundary', async () => {
    const bus = makeBus();
    render(<App basePath="/dashboard" session={SIGNED_OUT} bus={bus} />);
    await waitFor(() => expect(screen.getByText('1,204')).toBeInTheDocument());

    // Another application, built separately, could send anything.
    bus.emit('user:role-changed', 'not an object');
    bus.emit('user:role-changed', { userId: 42 });

    expect(screen.getByText('1,204')).toBeInTheDocument();
  });
});
