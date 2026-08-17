/**
 * The shell's only configuration input.
 *
 * Fetched at runtime rather than compiled in, so switching environment is
 * switching a file and never a rebuild. See docs/USAGE.md's "The remote
 * registry" for what each field is for.
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
  /**
   * Which build of the remote this entry points at. Optional: a remote
   * served from a mutable path (dev, or a host that overwrites in place)
   * genuinely has no version to state, and claiming one would be a lie.
   *
   * The host never resolves or compares it — `entry` alone decides what
   * loads. It exists so the answer to "which version was in production when
   * this broke?" is in the same file that decided what to load, rather than
   * inferred from a URL by whoever is reading a stack trace at the time.
   */
  version?: string;
}

export interface RemoteRegistry {
  environment: Environment;
  /** Origins the host may execute code from. May be empty. */
  allowedOrigins: readonly string[];
  /** May be empty — an empty registry is a valid state. */
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
