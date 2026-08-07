import { useEffect } from 'react';
import { subscribe } from './bus';
import type { EventMap } from './event-map';

/**
 * Thin React convenience wrapper over subscribe()/unsubscribe — no
 * consuming component hand-rolls the effect + cleanup pair (the same
 * motivation packages/federation-utils has for existing at all).
 */
export function useEventSubscription<K extends keyof EventMap>(
  topic: K,
  handler: (payload: EventMap[K]) => void,
): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: handler is typically a fresh closure per render at call sites; resubscribing on every identity change would defeat the point of a stable subscription for the component's lifetime.
  useEffect(() => {
    return subscribe(topic, handler);
  }, [topic]);
}
