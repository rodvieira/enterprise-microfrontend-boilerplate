import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from '../src/context';

function Header() {
  const { user, logout } = useAuth();
  return (
    <header>
      <span data-testid="header-user">{user ? user.name : 'signed out'}</span>
      <button type="button" onClick={() => void logout()}>
        Sign out
      </button>
    </header>
  );
}

function Sidebar() {
  const { user, login } = useAuth();
  return (
    <aside>
      <span data-testid="sidebar-user">{user ? user.name : 'signed out'}</span>
      <button type="button" onClick={() => void login()}>
        Sign in
      </button>
    </aside>
  );
}

describe('one shared session', () => {
  it('gives two separate consumers the same state and the same updates', async () => {
    render(
      <AuthProvider>
        <Header />
        <Sidebar />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => {
      expect(screen.getByTestId('header-user')).not.toHaveTextContent('signed out');
    });

    // Both read the same session, never two copies.
    expect(screen.getByTestId('header-user').textContent).toBe(
      screen.getByTestId('sidebar-user').textContent,
    );

    // A sign-out triggered in one is observed by the other immediately.
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => {
      expect(screen.getByTestId('sidebar-user')).toHaveTextContent('signed out');
    });
    expect(screen.getByTestId('header-user')).toHaveTextContent('signed out');
  });
});
