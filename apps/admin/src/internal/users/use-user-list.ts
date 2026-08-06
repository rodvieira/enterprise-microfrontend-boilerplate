import { publish } from '@enterprise-mfe/event-bus';
import type { Role, User } from '@enterprise-mfe/shared-types';
import { permissionsForRole } from '@enterprise-mfe/shared-types';
import { useMemo, useState } from 'react';
import { createUserFixtures } from './fixtures';

export type SortColumn = 'name' | 'email' | 'role';
export type SortDirection = 'asc' | 'desc';

export interface NewUserInput {
  name: string;
  email: string;
  role: Role;
}

export type MutationOutcome = { ok: true } | { ok: false; error: string };

const PAGE_SIZE = 10;

function sortUsers(users: readonly User[], column: SortColumn, direction: SortDirection): User[] {
  const sorted = [...users].sort((a, b) => a[column].localeCompare(b[column]));
  return direction === 'asc' ? sorted : sorted.reverse();
}

/**
 * Owns the mutable in-memory fixture (data-model.md), pagination, and sort
 * state — all admin-local (research D6). Publishes 'user:role-changed'
 * only after a role-change mutation actually succeeds (FR-013).
 */
export function useUserList() {
  const [allUsers, setAllUsers] = useState<User[]>(() => createUserFixtures());
  const [page, setPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sorted = useMemo(
    () => sortUsers(allUsers, sortColumn, sortDirection),
    [allUsers, sortColumn, sortDirection],
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const users = sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function setSort(column: SortColumn): void {
    if (column === sortColumn) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  function nextPage(): void {
    setPage((current) => Math.min(current + 1, pageCount - 1));
  }

  function previousPage(): void {
    setPage((current) => Math.max(current - 1, 0));
  }

  function addUser(input: NewUserInput): MutationOutcome {
    const name = input.name.trim();
    const email = input.email.trim();

    if (!name || !email) {
      return { ok: false, error: 'Name and email are required.' };
    }
    if (allUsers.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'A user with this email already exists.' };
    }

    const newUser: User = {
      id: `user-${crypto.randomUUID()}`,
      name,
      email,
      role: input.role,
      permissions: permissionsForRole(input.role),
    };
    setAllUsers((current) => [...current, newUser]);
    setPage(0);
    return { ok: true };
  }

  function changeRole(userId: string, newRole: Role): MutationOutcome {
    if (!allUsers.some((user) => user.id === userId)) {
      return { ok: false, error: 'That user no longer exists.' };
    }

    setAllUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? { ...user, role: newRole, permissions: permissionsForRole(newRole) }
          : user,
      ),
    );
    publish('user:role-changed', { userId, newRole });
    return { ok: true };
  }

  return {
    users,
    allUsers,
    totalCount: allUsers.length,
    page: currentPage,
    pageCount,
    pageSize: PAGE_SIZE,
    sortColumn,
    sortDirection,
    setSort,
    nextPage,
    previousPage,
    addUser,
    changeRole,
  };
}
