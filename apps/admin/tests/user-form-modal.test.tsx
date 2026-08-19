import type { Role, User } from '@enterprise-mfe/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MutationOutcome, NewUserInput } from '../src/internal/users/use-user-list';
import { UserFormModal } from '../src/internal/users/user-form-modal';

// The remote reads the host's session through its own context, which App
// fills from props. Mocking that is mocking this app, not a package.
const { useHostMock } = vi.hoisted(() => ({ useHostMock: vi.fn() }));

vi.mock('../src/internal/host-context', () => ({
  useHost: useHostMock,
}));

function session(user: unknown) {
  return {
    session: { user, isAuthenticated: user !== null },
    bus: { publish: vi.fn(), subscribe: vi.fn(() => () => {}) },
  };
}

const USERS: readonly User[] = [
  { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin', permissions: [] },
];

interface RenderModalOverrides {
  onInvite?: (input: NewUserInput) => MutationOutcome;
  onChangeRole?: (userId: string, newRole: Role) => MutationOutcome;
}

function renderModal(overrides: RenderModalOverrides = {}) {
  const onInvite = vi.fn(overrides.onInvite ?? (() => ({ ok: true }) as MutationOutcome));
  const onChangeRole = vi.fn(overrides.onChangeRole ?? (() => ({ ok: true }) as MutationOutcome));
  render(<UserFormModal users={USERS} onInvite={onInvite} onChangeRole={onChangeRole} />);
  return { onInvite, onChangeRole };
}

describe('UserFormModal', () => {
  it('is not offered at all without users:write', () => {
    useHostMock.mockReturnValue(session({ permissions: ['users:read'] }));
    renderModal();
    expect(screen.queryByRole('button', { name: /invite or edit user/i })).not.toBeInTheDocument();
  });

  it('lets a session with users:write submit a new user', async () => {
    useHostMock.mockReturnValue(session({ permissions: ['users:write'] }));
    const { onInvite } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: /invite or edit user/i }));
    await userEvent.type(screen.getByLabelText('Name'), 'New Person');
    await userEvent.type(screen.getByLabelText('Email'), 'new.person@example.com');
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(onInvite).toHaveBeenCalledWith({
      name: 'New Person',
      email: 'new.person@example.com',
      role: 'viewer',
    });
  });

  it('lets a session with users:write submit a role change', async () => {
    useHostMock.mockReturnValue(session({ permissions: ['users:write'] }));
    const { onChangeRole } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: /invite or edit user/i }));
    await userEvent.click(screen.getByLabelText(/change an existing user's role/i));
    await userEvent.selectOptions(screen.getByLabelText('New role'), 'editor');
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(onChangeRole).toHaveBeenCalledWith('user-1', 'editor');
  });

  it('rejects an invalid submission with a visible reason and does not call onInvite', async () => {
    useHostMock.mockReturnValue(session({ permissions: ['users:write'] }));
    renderModal({
      onInvite: () => ({ ok: false, error: 'Name and email are required.' }),
    });

    await userEvent.click(screen.getByRole('button', { name: /invite or edit user/i }));
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Name and email are required.');
  });
});
