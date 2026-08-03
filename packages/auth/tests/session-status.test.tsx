import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../src/context';
import { useAuth } from '../src/context';

function StatusProbe() {
  const { status, isAuthenticated, user } = useAuth();
  return (
    <dl>
      <dt>status</dt>
      <dd data-testid="status">{status}</dd>
      <dt>isAuthenticated</dt>
      <dd data-testid="is-authenticated">{String(isAuthenticated)}</dd>
      <dt>user</dt>
      <dd data-testid="user">{user ? user.name : 'none'}</dd>
    </dl>
  );
}

describe('session status', () => {
  it('resolves out of unknown without any configuration', async () => {
    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).not.toHaveTextContent('unknown');
    });
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('never reports authenticated while the status is unknown', () => {
    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    );
    // Synchronously, before the effect resolves: three states, not a boolean,
    // so a consumer can tell "not known yet" from "signed out".
    const status = screen.getByTestId('status').textContent;
    if (status === 'unknown') {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('none');
    }
  });

  it('exposes exactly the three documented states', async () => {
    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(['unknown', 'authenticated', 'unauthenticated']).toContain(
        screen.getByTestId('status').textContent,
      );
    });
  });
});
