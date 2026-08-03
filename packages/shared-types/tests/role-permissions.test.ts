import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS, permissionsForRole } from '../src/user';
import type { Permission, Role } from '../src/user';

const ALL_ROLES: readonly Role[] = ['admin', 'editor', 'viewer'];
const ALL_PERMISSIONS: readonly Permission[] = ['users:read', 'users:write', 'dashboard:read'];

describe('ROLE_PERMISSIONS', () => {
  it('has an entry for every role', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
    expect(Object.keys(ROLE_PERMISSIONS)).toHaveLength(ALL_ROLES.length);
  });

  it('grants only permissions that exist', () => {
    for (const role of ALL_ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(ALL_PERMISSIONS).toContain(permission);
      }
    }
  });

  it('is frozen, so one consumer cannot mutate the table another reads', () => {
    expect(Object.isFrozen(ROLE_PERMISSIONS)).toBe(true);
    expect(Object.isFrozen(ROLE_PERMISSIONS.admin)).toBe(true);
  });

  it('gives admin every permission', () => {
    expect([...ROLE_PERMISSIONS.admin].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it('narrows capability as the role narrows', () => {
    expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(ROLE_PERMISSIONS.editor.length);
    expect(ROLE_PERMISSIONS.editor.length).toBeGreaterThan(ROLE_PERMISSIONS.viewer.length);
  });

  it('resolves permissions through permissionsForRole', () => {
    expect(permissionsForRole('viewer')).toEqual(['dashboard:read']);
  });
});
