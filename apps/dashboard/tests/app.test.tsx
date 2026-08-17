import { AuthProvider, useAuth } from '@enterprise-mfe/auth';
import { publish } from '@enterprise-mfe/event-bus';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../src/exposed/App';

/** Exposes the stub's login() as a button — the dashboard itself has no sign-in UI (that's shell chrome's job). */
function SignInButton() {
  const { login } = useAuth();
  return (
    <button type="button" onClick={() => login()}>
      Sign in
    </button>
  );
}

describe('App', () => {
  it('renders standalone, given a basePath, with no shell present', async () => {
    render(
      <AuthProvider>
        <App basePath="/dashboard" />
      </AuthProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Not signed in')).toBeInTheDocument());
  });

  it('reads the current session via the shared auth contract', async () => {
    render(
      <AuthProvider>
        <SignInButton />
        <App basePath="/dashboard" />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('Not signed in')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('Signed in as Ada Lovelace')).toBeInTheDocument());
  });

  it('increments the active-users KPI when a user:role-changed event is received', async () => {
    render(
      <AuthProvider>
        <App basePath="/dashboard" />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('1,204')).toBeInTheDocument());

    publish('user:role-changed', { userId: 'user-1', newRole: 'editor' });

    await waitFor(() => expect(screen.getByText('1,205')).toBeInTheDocument());
  });
});
