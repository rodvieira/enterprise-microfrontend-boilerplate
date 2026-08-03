/** Contracts for props that cross an app boundary. */

/**
 * The style hook every design-system component accepts and forwards, so a
 * consumer can adapt appearance without forking the component.
 */
export interface WithClassName {
  readonly className?: string;
}

/**
 * What the shell passes into a remote's exposed root component.
 *
 * Defined before any remote exists on purpose: the shell and both remotes are
 * built in later sprints and must be written against one shape rather than each
 * inventing its own. Kept minimal — what a remote needs from its host, and
 * nothing speculative.
 */
export interface RemoteAppProps {
  /** The route path the shell mounted this remote under, without a trailing slash. */
  readonly basePath: string;
}
