import { afterEach, describe, expect, it, vi } from 'vitest';
import { publish, subscribe } from '../src/bus';

const TOPIC = 'user:role-changed' as const;
const PAYLOAD = { userId: 'user-1', newRole: 'editor' as const };

describe('publish / subscribe', () => {
  const unsubscribers: Array<() => void> = [];

  afterEach(() => {
    for (const unsubscribe of unsubscribers.splice(0)) {
      unsubscribe();
    }
  });

  it('calls every currently-subscribed handler for a topic, in subscription order', () => {
    const calls: string[] = [];
    unsubscribers.push(subscribe(TOPIC, () => calls.push('first')));
    unsubscribers.push(subscribe(TOPIC, () => calls.push('second')));

    publish(TOPIC, PAYLOAD);

    expect(calls).toEqual(['first', 'second']);
  });

  it('does not let a throwing handler prevent other handlers from running', () => {
    const calls: string[] = [];
    unsubscribers.push(
      subscribe(TOPIC, () => {
        calls.push('before-throw');
        throw new Error('boom');
      }),
    );
    unsubscribers.push(subscribe(TOPIC, () => calls.push('after-throw')));

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    publish(TOPIC, PAYLOAD);
    consoleError.mockRestore();

    expect(calls).toEqual(['before-throw', 'after-throw']);
  });

  it('removes exactly the unsubscribed handler, no others', () => {
    const calls: string[] = [];
    const unsubscribeFirst = subscribe(TOPIC, () => calls.push('first'));
    unsubscribers.push(subscribe(TOPIC, () => calls.push('second')));

    unsubscribeFirst();
    publish(TOPIC, PAYLOAD);

    expect(calls).toEqual(['second']);
  });

  it('does not queue or replay an event to a subscriber that arrives later (FR-016)', () => {
    publish(TOPIC, PAYLOAD);

    const calls: unknown[] = [];
    unsubscribers.push(subscribe(TOPIC, (payload) => calls.push(payload)));

    expect(calls).toEqual([]);
  });

  it('is received by a subscriber connected only through the BroadcastChannel relay (research D2)', async () => {
    // A second channel instance with the same name — standing in for a
    // second browser tab, which shares no in-memory state with this one.
    const remoteTabChannel = new BroadcastChannel('@enterprise-mfe/event-bus');
    const received = new Promise((resolve) => {
      remoteTabChannel.addEventListener('message', (event) => resolve(event.data), {
        once: true,
      });
    });

    publish(TOPIC, PAYLOAD);

    await expect(received).resolves.toEqual({ topic: TOPIC, payload: PAYLOAD });
    remoteTabChannel.close();
  });
});
