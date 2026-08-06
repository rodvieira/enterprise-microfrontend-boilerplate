import type { EventMap } from './event-map';

/**
 * Typed publish/subscribe (contracts/event-bus-contract.md). Same-tab
 * delivery is a plain Map<topic, Set<handler>>; cross-tab delivery is a
 * same-origin BroadcastChannel relay (research D2) — a separate channel
 * instance with the same name never receives its own postMessage, so this
 * module's own channel is never delivered to twice.
 */

const CHANNEL_NAME = '@enterprise-mfe/event-bus';

type Handler = (payload: unknown) => void;

const subscribers = new Map<string, Set<Handler>>();
const channel = new BroadcastChannel(CHANNEL_NAME);

interface RelayedMessage {
  topic: string;
  payload: unknown;
}

channel.addEventListener('message', (event: MessageEvent<RelayedMessage>) => {
  deliverLocally(event.data.topic, event.data.payload);
});

function deliverLocally(topic: string, payload: unknown): void {
  const handlers = subscribers.get(topic);
  if (!handlers) {
    return;
  }
  for (const handler of handlers) {
    try {
      handler(payload);
    } catch (error) {
      console.error(`[event-bus] a subscriber for "${topic}" threw:`, error);
    }
  }
}

export function publish<K extends keyof EventMap>(topic: K, payload: EventMap[K]): void {
  deliverLocally(topic, payload);
  channel.postMessage({ topic, payload } satisfies RelayedMessage);
}

export function subscribe<K extends keyof EventMap>(
  topic: K,
  handler: (payload: EventMap[K]) => void,
): () => void {
  let handlers = subscribers.get(topic);
  if (!handlers) {
    handlers = new Set();
    subscribers.set(topic, handlers);
  }
  const asHandler = handler as Handler;
  handlers.add(asHandler);
  return () => {
    handlers?.delete(asHandler);
  };
}
