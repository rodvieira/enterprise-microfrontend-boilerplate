import { useAuth } from '@enterprise-mfe/auth';

/**
 * Local permission check (research D4) — not a packages/auth contract
 * change. Reads the existing User.permissions shape from sprint 2.
 */
export function useCanWriteUsers(): boolean {
  const { user } = useAuth();
  return user?.permissions.includes('users:write') ?? false;
}
