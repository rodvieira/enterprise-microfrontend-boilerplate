import type { User } from '@enterprise-mfe/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserTable } from '../src/internal/users/user-table';

const USERS: readonly User[] = [
  { id: '1', name: 'Bea', email: 'bea@example.com', role: 'admin', permissions: [] },
  { id: '2', name: 'Amir', email: 'amir@example.com', role: 'viewer', permissions: [] },
];

describe('UserTable', () => {
  it('renders a bounded page of users using the shared design system Table', () => {
    render(<UserTable users={USERS} sortColumn="name" sortDirection="asc" onSort={() => {}} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2
    expect(screen.getByText('Bea')).toBeInTheDocument();
    expect(screen.getByText('Amir')).toBeInTheDocument();
  });

  it('choosing a sortable column calls onSort with that column', async () => {
    const onSort = vi.fn();
    render(<UserTable users={USERS} sortColumn="name" sortDirection="asc" onSort={onSort} />);

    await userEvent.click(screen.getByRole('button', { name: /email/i }));

    expect(onSort).toHaveBeenCalledWith('email');
  });
});
