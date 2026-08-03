# @enterprise-mfe/shared-types

The single definition of every concept that crosses an app boundary — `User`,
`Role`, `Permission`, and the prop shapes of anything the shell passes into a
remote. It exists so the shell and two independently-owned remotes cannot drift
into three slightly different notions of what a user is, which is how federated
frontends break in ways that only surface in production. Import from here rather
than redeclaring a shape locally; when a definition changes, every consumer that
no longer matches fails type-checking instead of failing at runtime.

## Usage

```ts
import type { Permission, Role, User } from '@enterprise-mfe/shared-types';
import { ROLE_PERMISSIONS, permissionsForRole } from '@enterprise-mfe/shared-types';
```

## Runtime footprint

Almost none. This package is type declarations plus one frozen lookup table,
`ROLE_PERMISSIONS`, which maps each role to the permissions it grants. That table
is data rather than behaviour, and it lives here so the admin remote (which
changes a person's role) and the dashboard (which reacts to the change) read the
same source instead of each hard-coding it.

Everything else disappears at compile time.

## Contract changes

`Permission` and `Role` are closed unions, not `string`. A typo in a permission
check is a compile error rather than a silent denial. `tests/contract-propagation.test-d.ts`
asserts the exact shapes, so widening or narrowing one is a deliberate act that
shows up in review.
