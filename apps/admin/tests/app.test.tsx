import { AuthProvider, useAuth } from '@enterprise-mfe/auth';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../src/exposed/App';

/** Exposes the stub's login() as a button — admin has no sign-in UI of its own. */
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
        <App basePath="/admin" />
      </AuthProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Not signed in')).toBeInTheDocument());
  });

  it('reads the current session via the shared auth contract', async () => {
    render(
      <AuthProvider>
        <SignInButton />
        <App basePath="/admin" />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('Not signed in')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('Signed in as Ada Lovelace')).toBeInTheDocument());
  });
});
