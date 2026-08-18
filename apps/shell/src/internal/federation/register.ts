import { judgeOrigin } from './origin-guard';
import type { RemoteRegistration, RemoteRegistry } from './types';

interface RefusedRemote {
  registration: RemoteRegistration;
  reason: string;
  origin: string;
}

export interface RegisterOutcome {
  registered: readonly RemoteRegistration[];
  refused: readonly RefusedRemote[];
}

/**
 * "dashboard@1.4.2", or just "dashboard" when the registry states no
 * version. Every federation diagnostic goes through this, so the answer to
 * "which build was this?" is in the message rather than reconstructed from
 * a URL afterwards.
 */
export function describeRemote(registration: RemoteRegistration): string {
  return registration.version ? `${registration.name}@${registration.version}` : registration.name;
}

/**
 * Runs every registration through origin-guard.ts before calling the
 * Module Federation runtime's registerRemotes(). A refused remote is dropped
 * here — it never reaches registerRemotes, so it never becomes a fetch
 * attempt, let alone a RemoteLoadState.
 */
export async function registerAllowedRemotes(
  registry: RemoteRegistry,
  /** Defaults to the running page's origin; injectable so tests stay pure. */
  selfOrigin: string = globalThis.location?.origin ?? '',
): Promise<RegisterOutcome> {
  const registered: RemoteRegistration[] = [];
  const refused: RefusedRemote[] = [];

  for (const registration of registry.remotes) {
    const decision = judgeOrigin(registration.entry, registry.allowedOrigins, selfOrigin);
    if (decision.allowed) {
      registered.push(registration);
    } else {
      refused.push({ registration, reason: decision.reason, origin: decision.origin });
      console.error(
        `[federation] refused remote "${describeRemote(registration)}": ${decision.reason} (origin: "${decision.origin || registration.entry}").`,
      );
    }
  }

  if (registered.length > 0) {
    const { registerRemotes } = await import('@module-federation/enhanced/runtime');
    registerRemotes(registered.map((remote) => ({ name: remote.name, entry: remote.entry })));
  }

  return { registered, refused };
}
