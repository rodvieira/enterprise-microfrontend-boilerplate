import type { RemoteBus } from '@enterprise-mfe/shared-types';

/**
 * The host's message bus, handed to every remote as a prop.
 *
 * The host owns it rather than shipping it as a package, because a remote
 * lives in another repository and cannot install one. Same-tab delivery is a
 * plain `Map<topic, Set<handler>>`; cross-tab delivery is a same-origin
 * `BroadcastChannel` relay — a separate channel instance with the same name
 * never receives its own `postMessage`, so this module's own channel is
 * never delivered to twice.
 *
 * Topics are plain strings and payloads are `unknown`. There is no shared
 * `EventMap` any more: publisher and subscriber are separately built,
 * separately deployed applications, so a compile-time contract between them
 * would be a guarantee nothing can enforce. Each subscriber validates what
 * it receives — see `apps/dashboard` for the shape of that check.
 */

const CHANNEL_NAME = 'enterprise-mfe:bus';

type Handler = (payload: unknown) => void;

interface RelayedMessage {
  topic: string;
  payload: unknown;
}

const subscribers = new Map<string, Set<Handler>>();
const channel = new BroadcastChannel(CHANNEL_NAME);

function deliverLocally(topic: string, payload: unknown): void {
  const handlers = subscribers.get(topic);
  if (!handlers) return;
  for (const handler of handlers) {
    try {
      handler(payload);
    } catch (error) {
      // One remote's broken handler must not stop delivery to the others.
      console.error(`[bus] a subscriber for "${topic}" threw:`, error);
    }
  }
}

channel.addEventListener('message', (event: MessageEvent<RelayedMessage>) => {
  const message = event.data;
  if (typeof message !== 'object' || message === null || typeof message.topic !== 'string') {
    console.warn('[bus] ignored a cross-tab message that is not a bus message:', message);
    return;
  }
  deliverLocally(message.topic, message.payload);
});

/**
 * The single instance every remote receives. Stable across renders, so a
 * remote can safely use it in a dependency array.
 */
export const hostBus: RemoteBus = {
  publish(topic, payload) {
    deliverLocally(topic, payload);
    channel.postMessage({ topic, payload } satisfies RelayedMessage);
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
