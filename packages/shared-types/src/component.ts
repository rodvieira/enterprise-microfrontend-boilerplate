import type { User } from './user';

/** Contracts for props that cross an app boundary. */

/**
 * The style hook a component accepts and forwards, so a consumer can adapt
 * appearance without forking the component.
 */
export interface WithClassName {
  readonly className?: string;
}

/** Who is signed in, as far as a remote needs to know. */
export interface RemoteSession {
  /** Non-null exactly when `isAuthenticated` is true. */
  readonly user: User | null;
  readonly isAuthenticated: boolean;
}

/**
 * Cross-remote messaging, owned and supplied by the host.
 *
 * `payload` is `unknown` on purpose. A remote is a separately built,
 * separately deployed application — possibly not even React — so a shared
 * payload type here would be a guarantee the compiler has no way to enforce
 * across that boundary. The receiver validates what it gets.
 */
export interface RemoteBus {
  publish(topic: string, payload: unknown): void;
  /** Returns an unsubscribe function. */
  subscribe(topic: string, handler: (payload: unknown) => void): () => void;
}

/**
 * Everything the host passes into a remote's exposed root component — and
 * the **only** thing a remote needs from this project.
 *
 * A remote lives in its own repository and its own deployment. It cannot
 * install packages from here without a registry, so nothing it needs arrives
 * as an import: the session it should respect and the bus it talks to are
 * handed in as props. That keeps a remote free to be built by another team,
 * with another toolchain, depending on nothing of ours.
 */
export interface RemoteAppProps {
  /** The route path the host mounted this remote under, without a trailing slash. */
  readonly basePath: string;
  readonly session: RemoteSession;
  readonly bus: RemoteBus;
}
