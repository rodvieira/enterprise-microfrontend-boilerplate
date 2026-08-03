import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from '../src/context';
import { ProtectedRoute } from '../src/protected-route';

function Controls() {
  const { login, logout, user } = useAuth();
  return (
    <>
      <button type="button" onClick={() => void login()}>
        Sign in
      </button>
      <button type="button" onClick={() => void logout()}>
        Sign out
      </button>
      <span data-testid="who">{user ? `${user.name}:${user.role}` : 'nobody'}</span>
    </>
  );
}

function Harness() {
  return (
    <AuthProvider>
      <Controls />
      <ProtectedRoute fallback={<p>Please sign in</p>}>
        <p>Secret dashboard</p>
      </ProtectedRoute>
    </AuthProvider>
  );
}

describe('ProtectedRoute', () => {
  it('keeps protected children out of the tree entirely while signed out', async () => {
    render(<Harness />);
    await waitFor(() => expect(screen.getByText('Please sign in')).toBeInTheDocument());

    // Absent, not hidden with CSS — nothing to reveal in devtools.
    expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument();
  });

  it('renders children and exposes identity after signing in', async () => {
    render(<Harness />);
    await waitFor(() => expect(screen.getByText('Please sign in')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('Secret dashboard')).toBeInTheDocument());
    expect(screen.queryByText('Please sign in')).not.toBeInTheDocument();
    expect(screen.getByTestId('who')).toHaveTextContent('admin');
  });

  it('withdraws access again on sign out', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByText('Secret dashboard')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument());
  });

  it('renders the pending element while the status is unknown, not the fallback', () => {
    render(
      <AuthProvider>
        <ProtectedRoute fallback={<p>Please sign in</p>} pending={<p>Checking…</p>}>
          <p>Secret dashboard</p>
        </ProtectedRoute>
      </AuthProvider>,
    );
    // Synchronous first paint: no flash of the signed-out fallback.
    expect(screen.queryByText('Please sign in')).not.toBeInTheDocument();
    expect(screen.getByText('Checking…')).toBeInTheDocument();
  });

  it('renders a default prompt when no fallback is supplied', async () => {
    render(
      <AuthProvider>
        <ProtectedRoute>
          <p>Secret dashboard</p>
        </ProtectedRoute>
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument();
  });
});
