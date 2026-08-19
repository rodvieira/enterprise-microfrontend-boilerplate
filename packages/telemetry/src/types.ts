/**
 * The telemetry contract, not a telemetry implementation.
 *
 * Same shape of decision as the shell's stub session: enterprises
 * bring their own vendor — Sentry, Datadog, OpenTelemetry, an internal
 * collector — and a boilerplate that picked one would be wrong for
 * everybody else and would drag that vendor's SDK across the federation
 * boundary into every remote.
 *
 * So this package ships the interface and a console-backed default, and
 * `docs/USAGE.md` documents the swap.
 */

/**
 * Which remote an event is about.
 *
 * `version` comes from the registry when it states one — it is
 * the whole reason that field exists, because "which build broke?" is only
 * answerable if the answer travels with the failure.
 */
export interface RemoteContext {
  /** The registry name, matching what registerRemotes was given. */
  name: string;
  /** The build this entry points at, when the registry states one. */
  version?: string;
  /** The host route the remote is mounted under. */
  routePath?: string;
}

/**
 * Every method is fire-and-forget and must not throw: an implementation
 * that fails is a monitoring outage, and turning that into a broken page
 * would make observability the thing that takes production down. The
 * provider enforces this rather than trusting each implementation to.
 */
export interface Telemetry {
  /** A remote's code started downloading. */
  remoteLoadStarted(remote: RemoteContext): void;
  /** The remote's module resolved. `durationMs` is measured from start. */
  remoteLoadSucceeded(remote: RemoteContext, durationMs: number): void;
  /** The remote never loaded — network, origin refusal, timeout, bad export. */
  remoteLoadFailed(remote: RemoteContext, error: Error, durationMs: number): void;
  /**
   * The remote loaded, then threw while rendering. Deliberately distinct
   * from a load failure: they have different causes and different owners,
   * and collapsing them is what makes a dashboard useless during an
   * incident.
   */
  remoteRenderCrashed(remote: RemoteContext, error: Error): void;
}
