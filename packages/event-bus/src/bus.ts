import { eventValidators } from './event-map';
import type { EventMap } from './event-map';

/**
 * Typed publish/subscribe (contracts/event-bus-contract.md). Same-tab
 * delivery is a plain Map<topic, Set<handler>>; cross-tab delivery is a
 * same-origin BroadcastChannel relay — a separate channel
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

/**
 * The cross-tab edge, and the only place a payload is checked at runtime.
 *
 * A same-tab publish is already guaranteed by the compiler: publisher and
 * subscriber are one build. A cross-tab message is not — the other tab may
 * be running an independently-deployed build of the same remote, which is
 * the premise of this whole architecture, so its idea of a payload's shape
 * can legitimately differ from this one's. Delivering it unchecked hands a
 * subscriber something typed as valid that is not.
 *
 * Unknown topics and invalid payloads are dropped with a warning rather
 * than thrown: a newer tab publishing a topic this build has never heard of
 * is expected during a rollout, not an error, and there is no caller here
 * to catch a throw anyway.
 */
channel.addEventListener('message', (event: MessageEvent<RelayedMessage>) => {
  const message = event.data;
  if (typeof message !== 'object' || message === null || typeof message.topic !== 'string') {
    console.warn('[event-bus] ignored a cross-tab message that is not a bus message:', message);
    return;
  }

  const validate = eventValidators[message.topic as keyof EventMap];
  if (!validate) {
    console.warn(
      `[event-bus] ignored cross-tab topic "${message.topic}" — this build does not know it. A newer tab publishing a topic this one has never heard of is expected during a rollout.`,
    );
    return;
  }

  if (!validate(message.payload)) {
    console.warn(
      `[event-bus] dropped a cross-tab "${message.topic}" payload that does not match this build's contract:`,
      message.payload,
    );
    return;
  }

  deliverLocally(message.topic, message.payload);
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
