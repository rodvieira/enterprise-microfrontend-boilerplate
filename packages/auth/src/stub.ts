import type { User } from '@enterprise-mfe/shared-types';
import { permissionsForRole } from '@enterprise-mfe/shared-types';

/**
 * The in-memory stub session.
 *
 * This file is the entire fake. Everything else in this package is the contract
 * that a real identity provider would satisfy, so swapping this out is a
 * one-file change and no consumer notices (constitution Principle VI, ADR-0009).
 *
 * It contacts nothing: no network, no storage, no environment variable. That is
 * asserted in `tests/stub-isolation.test.ts`.
 */
export const STUB_USER: User = Object.freeze({
  id: 'stub-user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'admin',
  permissions: permissionsForRole('admin'),
});

/** Stands in for whatever a real provider does to establish a session. */
export async function stubSignIn(): Promise<User> {
  return STUB_USER;
}

/** Stands in for whatever a real provider does to end one. */
export async function stubSignOut(): Promise<void> {
  return;
}

/**
 * Stands in for restoring an existing session on load. The stub has nothing to
 * restore, so it resolves to nobody — a real implementation would return the
 * person behind an existing cookie or token here.
 */
export async function stubRestore(): Promise<User | null> {
  return null;
}
