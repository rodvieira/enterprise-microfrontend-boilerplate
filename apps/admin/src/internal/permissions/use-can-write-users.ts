import { useHost } from '../host-context';

/**
 * Local permission check, against the session the host handed in. Reads the
 * User.permissions shape @enterprise-mfe/shared-types already defines.
 */
export function useCanWriteUsers(): boolean {
  const { session } = useHost();
  return session.user?.permissions.includes('users:write') ?? false;
}
