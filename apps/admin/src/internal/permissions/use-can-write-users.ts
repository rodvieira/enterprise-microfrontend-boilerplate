import { useAuth } from '@enterprise-mfe/auth';

/**
 * Local permission check — not a packages/auth contract
 * change. Reads the User.permissions shape @enterprise-mfe/shared-types
 * already defines.
 */
export function useCanWriteUsers(): boolean {
  const { user } = useAuth();
  return user?.permissions.includes('users:write') ?? false;
}
