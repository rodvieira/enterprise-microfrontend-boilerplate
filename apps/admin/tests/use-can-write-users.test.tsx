import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCanWriteUsers } from '../src/internal/permissions/use-can-write-users';

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock('@enterprise-mfe/auth', () => ({
  useAuth: useAuthMock,
}));

function Probe() {
  const canWrite = useCanWriteUsers();
  return <span>{canWrite ? 'can-write' : 'cannot-write'}</span>;
}

describe('useCanWriteUsers', () => {
  it('is true for a user whose permissions include users:write', () => {
    useAuthMock.mockReturnValue({ user: { permissions: ['users:read', 'users:write'] } });
    render(<Probe />);
    expect(screen.getByText('can-write')).toBeInTheDocument();
  });

  it('is false for a user whose permissions do not include users:write', () => {
    useAuthMock.mockReturnValue({ user: { permissions: ['users:read'] } });
    render(<Probe />);
    expect(screen.getByText('cannot-write')).toBeInTheDocument();
  });

  it('is false when there is no session', () => {
    useAuthMock.mockReturnValue({ user: null });
    render(<Probe />);
    expect(screen.getByText('cannot-write')).toBeInTheDocument();
  });
});
