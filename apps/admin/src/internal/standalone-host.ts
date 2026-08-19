import type { RemoteBus, RemoteSession } from '@enterprise-mfe/shared-types';

/**
 * What this remote uses for `session` and `bus` when it runs on its own,
 * with no host to supply them.
 *
 * A remote must render fully standalone — that is what lets it live in its
 * own repository and be developed without the orchestrator running. So the
 * props it normally receives get local stand-ins here: a signed-out session
 * and a bus that only talks to this page.
 *
 * Development only. In production the host supplies both.
 */
export const standaloneSession: RemoteSession = {
  user: null,
  isAuthenticated: false,
};

const subscribers = new Map<string, Set<(payload: unknown) => void>>();

export const standaloneBus: RemoteBus = {
  publish(topic, payload) {
    for (const handler of subscribers.get(topic) ?? []) handler(payload);
  },
  subscribe(topic, handler) {
    let handlers = subscribers.get(topic);
    if (!handlers) {
      handlers = new Set();
      subscribers.set(topic, handlers);
    }
    handlers.add(handler);
    return () => {
      handlers?.delete(handler);
    };
  },
};
