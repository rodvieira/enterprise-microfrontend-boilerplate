/**
 * Identity contracts shared between the shell and every remote.
 *
 * Defined once here so the admin remote (which changes a person's role) and the
 * dashboard (which reacts to that change) agree on the shape without either one
 * importing the other.
 */

/**
 * A named capability, checked before an action is allowed.
 *
 * A closed union rather than `string`, so a typo in a permission check fails
 * type-checking instead of silently denying access at runtime.
 */
export type Permission = 'users:read' | 'users:write' | 'dashboard:read';

/** A named bundle of permissions. */
export type Role = 'admin' | 'editor' | 'viewer';

/**
 * Someone with an identity in the system.
 *
 * Deliberately does not model credentials, profile management, groups, or
 * organizations. Credentials never enter this model — the auth stub has no
 * password, and a real provider's tokens never reach the browser.
 */
export interface User {
  /** Stable and opaque. Never reused. */
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  /** Derived from `role`. Readonly so one consumer cannot mutate another's copy. */
  readonly permissions: readonly Permission[];
}

/**
 * The role-to-permission table. This is the one piece of runtime data in this
 * package: it is data, not behavior, and both the admin remote and the dashboard
 * must read the same table rather than each hard-coding it.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = Object.freeze({
  admin: Object.freeze(['users:read', 'users:write', 'dashboard:read'] as const),
  editor: Object.freeze(['users:read', 'dashboard:read'] as const),
  viewer: Object.freeze(['dashboard:read'] as const),
});

/** Resolve the permissions a role grants. */
export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
