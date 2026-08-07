import type { Role } from '@enterprise-mfe/shared-types';

/**
 * Published by apps/admin after a role change succeeds, consumed by
 * apps/dashboard to update its "active users" KPI. Deliberately carries
 * nothing about admin's internal state beyond what dashboard needs
 * (data-model.md).
 */
export interface RoleChangedEvent {
  userId: string;
  newRole: Role;
}

/**
 * The closed set of topics this bus carries. A topic not listed here fails
 * to type-check at both publish() and subscribe() call sites — the same
 * discipline Permission and Role already use in shared-types. Adding a
 * second event later is a type addition here, not an API change.
 */
export interface EventMap {
  'user:role-changed': RoleChangedEvent;
}
