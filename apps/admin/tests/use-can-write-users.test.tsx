import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCanWriteUsers } from '../src/internal/permissions/use-can-write-users';

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

function Probe() {
  const canWrite = useCanWriteUsers();
  return <span>{canWrite ? 'can-write' : 'cannot-write'}</span>;
}

describe('useCanWriteUsers', () => {
  it('is true for a user whose permissions include users:write', () => {
    useHostMock.mockReturnValue(session({ permissions: ['users:read', 'users:write'] }));
    render(<Probe />);
    expect(screen.getByText('can-write')).toBeInTheDocument();
  });

  it('is false for a user whose permissions do not include users:write', () => {
    useHostMock.mockReturnValue(session({ permissions: ['users:read'] }));
    render(<Probe />);
    expect(screen.getByText('cannot-write')).toBeInTheDocument();
  });

  it('is false when there is no session', () => {
    useHostMock.mockReturnValue(session(null));
    render(<Probe />);
    expect(screen.getByText('cannot-write')).toBeInTheDocument();
  });
});
