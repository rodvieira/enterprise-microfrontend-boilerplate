/**
 * The shell's only configuration input. Shapes match data-model.md exactly —
 * see specs/002-shell-host/data-model.md for the full rationale behind each
 * field and rule.
 */

export type Environment = 'dev' | 'staging' | 'production';

export interface RemoteRegistration {
  /** Unique within the registry. Must match the name the remote's own build declares. */
  name: string;
  /** Absolute URL of the remote's entry manifest. Subject to origin control. */
  entry: string;
  /** The path the host mounts it under. Leading slash, no trailing slash. */
  routePath: string;
  /** What navigation shows a person. */
  label: string;
}

export interface RemoteRegistry {
  environment: Environment;
  /** Origins the host may execute code from. May be empty. */
  allowedOrigins: readonly string[];
  /** May be empty — an empty registry is a valid state (US1 scenario 2). */
  remotes: readonly RemoteRegistration[];
}

export type OriginRefusalReason = 'origin-not-allowed' | 'insecure-transport' | 'malformed-url';

export interface OriginDecision {
  allowed: boolean;
  reason: 'ok' | OriginRefusalReason;
  /** The origin that was judged, echoed for the diagnostic. Empty string when the URL could not be parsed. */
  origin: string;
}

const ENVIRONMENTS: readonly Environment[] = ['dev', 'staging', 'production'];

export function isEnvironment(value: unknown): value is Environment {
  return typeof value === 'string' && (ENVIRONMENTS as readonly string[]).includes(value);
}
