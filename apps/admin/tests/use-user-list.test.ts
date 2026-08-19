import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useUserList } from '../src/internal/users/use-user-list';

// The hook publishes onto the host's bus, which App supplies from props.
vi.mock('../src/internal/host-context', () => ({
  useHost: () => ({
    session: { user: null, isAuthenticated: false },
    bus: { publish: vi.fn(), subscribe: vi.fn(() => () => {}) },
  }),
}));

describe('useUserList', () => {
  it('paginates a fixture set larger than one page, bounded', () => {
    const { result } = renderHook(() => useUserList());

    expect(result.current.users.length).toBeLessThanOrEqual(result.current.pageSize);
    expect(result.current.pageCount).toBeGreaterThan(1);
  });

  it('sorting by a chosen column reorders the visible rows', () => {
    const { result } = renderHook(() => useUserList());
    const beforeFirstName = result.current.users[0]?.name;

    act(() => result.current.setSort('name'));
    const ascFirstName = result.current.users[0]?.name;

    act(() => result.current.setSort('name'));
    const descFirstName = result.current.users[0]?.name;

    expect(ascFirstName).not.toBe(descFirstName);
    expect(beforeFirstName).toBeDefined();
  });

  it('adding a user resets to the first page', () => {
    const { result } = renderHook(() => useUserList());

    act(() => result.current.nextPage());
    expect(result.current.page).toBe(1);

    act(() => {
      result.current.addUser({
        name: 'New Person',
        email: 'new.person@example.com',
        role: 'viewer',
      });
    });

    expect(result.current.page).toBe(0);
  });

  it('rejects an invalid submission and adds nothing', () => {
    const { result } = renderHook(() => useUserList());
    const before = result.current.totalCount;

    let outcome: { ok: boolean; error?: string } | undefined;
    act(() => {
      outcome = result.current.addUser({ name: '', email: '', role: 'viewer' });
    });

    expect(outcome?.ok).toBe(false);
    expect(result.current.totalCount).toBe(before);
  });

  it('rejects a duplicate email and adds nothing', () => {
    const { result } = renderHook(() => useUserList());
    const existingEmail = result.current.allUsers[0]?.email as string;
    const before = result.current.totalCount;

    let outcome: { ok: boolean; error?: string } | undefined;
    act(() => {
      outcome = result.current.addUser({ name: 'Duplicate', email: existingEmail, role: 'viewer' });
    });

    expect(outcome?.ok).toBe(false);
    expect(result.current.totalCount).toBe(before);
  });

  it('changeRole updates the role of an existing user', () => {
    const { result } = renderHook(() => useUserList());
    const target = result.current.allUsers[0];
    expect(target).toBeDefined();

    act(() => {
      result.current.changeRole((target as { id: string }).id, 'viewer');
    });

    const updated = result.current.allUsers.find((user) => user.id === target?.id);
    expect(updated?.role).toBe('viewer');
  });
});
