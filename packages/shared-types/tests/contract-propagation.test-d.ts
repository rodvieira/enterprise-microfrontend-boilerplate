/**
 * Type-level checks: a consumer must fail to compile when a shared shape changes
 * incompatibly (spec scenario 3.3).
 *
 * Deliberately not a `.test.ts` file — there is nothing to run. It is verified by
 * `pnpm typecheck`, which is where a broken contract should surface. Change any
 * field in `src/user.ts` and this file stops compiling.
 */

import type { Permission, Role, User } from '../src/user';
import { ROLE_PERMISSIONS } from '../src/user';

type Expect<T extends true> = T;
type Equal<A, B> = (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
  ? true
  : false;

// The permission set is closed. Adding a permission without updating consumers
// is a compile error, not a silent runtime denial.
type _PermissionIsClosed = Expect<
  Equal<Permission, 'users:read' | 'users:write' | 'dashboard:read'>
>;

// The role set is closed.
type _RoleIsClosed = Expect<Equal<Role, 'admin' | 'editor' | 'viewer'>>;

// Every field a consumer depends on, with its exact type.
type _UserShape = Expect<
  Equal<
    User,
    {
      readonly id: string;
      readonly name: string;
      readonly email: string;
      readonly role: Role;
      readonly permissions: readonly Permission[];
    }
  >
>;

// A consumer cannot mutate the shared table or a user's permissions.
type _PermissionsAreReadonly = Expect<Equal<User['permissions'], readonly Permission[]>>;

// Every role resolves through the table.
const _everyRoleIsMapped: Record<Role, readonly Permission[]> = ROLE_PERMISSIONS;

// @ts-expect-error — a permission outside the union is rejected.
const _rejectsUnknownPermission: Permission = 'users:delete';

// @ts-expect-error — a role outside the union is rejected.
const _rejectsUnknownRole: Role = 'superuser';

// @ts-expect-error — a User missing a required field is rejected.
const _rejectsPartialUser: User = { id: '1', name: 'Ada' };
