import type { Role, User } from '@enterprise-mfe/shared-types';
import { permissionsForRole } from '@enterprise-mfe/shared-types';

const FIRST_NAMES = [
  'Ada',
  'Grace',
  'Katherine',
  'Margaret',
  'Radia',
  'Barbara',
  'Frances',
  'Joan',
  'Adele',
  'Shafi',
] as const;

const LAST_NAMES = [
  'Lovelace',
  'Hopper',
  'Johnson',
  'Hamilton',
  'Perlman',
  'Liskov',
  'Allen',
  'Clarke',
  'Goldberg',
  'Ahmed',
] as const;

const ROLE_CYCLE: readonly Role[] = ['admin', 'editor', 'viewer'];

/**
 * 27 seeded users — enough to force pagination at any reasonable page size
 * (data-model.md). This project has no backend; this is the entire "data
 * source" — the same pattern apps/dashboard uses.
 */
export function createUserFixtures(): User[] {
  const users: User[] = [];
  for (let index = 0; index < 27; index++) {
    const first = FIRST_NAMES[index % FIRST_NAMES.length] as string;
    const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length] as string;
    const role = ROLE_CYCLE[index % ROLE_CYCLE.length] as Role;
    const name = `${first} ${last}`;
    users.push({
      id: `user-${index + 1}`,
      name,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${index}@example.com`,
      role,
      permissions: permissionsForRole(role),
    });
  }
  return users;
}
