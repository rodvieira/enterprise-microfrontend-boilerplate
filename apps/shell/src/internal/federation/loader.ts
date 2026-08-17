import type { RemoteLoader } from '@enterprise-mfe/federation-utils';
import type { ComponentType } from 'react';

/**
 * The federation-specific half of remote loading. Kept out of
 * @enterprise-mfe/federation-utils on purpose: that package
 * knows nothing about Module Federation, so it stays testable with a plain
 * loader function. This is the only file in the shell that imports the MF
 * runtime's loadRemote.
 *
 * `exposedModule` is `"<remoteName>/<exposedKey>"`, matching whatever the
 * remote's own federation.config.ts lists under `exposes` — see
 * docs/USAGE.md's "Remote loading" section.
 */
export function createFederationLoader<T>(exposedModule: string): RemoteLoader<T> {
  return async () => {
    const { loadRemote } = await import('@module-federation/enhanced/runtime');
    const exported = await loadRemote<Record<string, unknown>>(exposedModule);
    const candidate = (exported as { default?: unknown } | null)?.default;
    if (typeof candidate !== 'function') {
      throw new Error(`"${exposedModule}" has no usable default export.`);
    }
    return { default: candidate as ComponentType<T> };
  };
}
