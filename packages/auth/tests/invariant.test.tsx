import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from '../src/context';

const observed: Array<{ status: string; hasUser: boolean; isAuthenticated: boolean }> = [];

function Recorder() {
  const { status, user, isAuthenticated, login, logout } = useAuth();
  observed.push({ status, hasUser: user !== null, isAuthenticated });
  return (
    <>
      <button type="button" onClick={() => void login()}>
        Sign in
      </button>
      <button type="button" onClick={() => void logout()}>
        Sign out
      </button>
      <span data-testid="status">{status}</span>
    </>
  );
}

describe('session invariant', () => {
  it('keeps user non-null exactly when the status is authenticated', async () => {
    observed.length = 0;
    render(
      <AuthProvider>
        <Recorder />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    expect(observed.length).toBeGreaterThan(2);
    for (const snapshot of observed) {
      expect(snapshot.hasUser).toBe(snapshot.status === 'authenticated');
      expect(snapshot.isAuthenticated).toBe(snapshot.status === 'authenticated');
    }
  });
});
