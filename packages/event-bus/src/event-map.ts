import { ROLE_PERMISSIONS } from '@enterprise-mfe/shared-types';
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

/**
 * A runtime check per topic, for payloads arriving from another tab.
 *
 * Within one tab the `EventMap` types are enough: publisher and subscriber
 * are the same build, checked by the same compiler. Across tabs they are
 * not. Two tabs can be running two independently-deployed builds of the
 * same remote — that is the entire premise of this architecture — so a tab
 * on last week's admin can post the payload shape last week's `EventMap`
 * described, and a tab on today's dashboard will accept it as typed and
 * correct. Types cannot see across that boundary; only a check at the
 * receiving edge can.
 *
 * Hand-written rather than a schema library: there is one topic, and this
 * is ten lines. When the map grows past a handful of topics, a validator
 * library earns its place — and the shape here (one predicate per topic) is
 * what it would slot into.
 */
export type EventValidators = {
  [K in keyof EventMap]: (payload: unknown) => payload is EventMap[K];
};

function isRoleChangedEvent(payload: unknown): payload is RoleChangedEvent {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as Partial<RoleChangedEvent>;
  return (
    typeof candidate.userId === 'string' &&
    candidate.userId.length > 0 &&
    typeof candidate.newRole === 'string' &&
    // Reads the same role table shared-types already owns, rather than a
    // second copy of the role list that could drift from it.
    Object.hasOwn(ROLE_PERMISSIONS, candidate.newRole)
  );
}

export const eventValidators: EventValidators = {
  'user:role-changed': isRoleChangedEvent,
};
