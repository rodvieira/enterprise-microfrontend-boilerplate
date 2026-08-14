import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

/**
 * Every test here posts from a *separate* BroadcastChannel instance, which
 * is what stands in for another browser tab: a channel never receives its
 * own postMessage, so this is the only way to exercise the receiving edge.
 *
 * The scenario being defended against is not a hostile page — same-origin
 * script can do worse — it is version skew. Two tabs can be running two
 * independently-deployed builds of the same remote, which is the premise of
 * this architecture, so an older tab can legitimately post the payload
 * shape its own EventMap described.
 */
describe('cross-tab payload validation', () => {
  const unsubscribers: Array<() => void> = [];
  let otherTab: BroadcastChannel;

  /**
   * A payload the validator accepts, used only to mark a point in the
   * channel's queue. Never asserted on.
   */
  const SENTINEL = { userId: 'sentinel', newRole: 'viewer' } as const;

  beforeEach(() => {
    otherTab = new BroadcastChannel('@enterprise-mfe/event-bus');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
    otherTab.close();
    vi.restoreAllMocks();
  });

  /**
   * Waits until everything already posted has been processed.
   *
   * Not a timeout: BroadcastChannel delivery is asynchronous and, under CI
   * load, arbitrarily slow — a `setTimeout(0)` here let one test's message
   * arrive during the next one, which is exactly how this suite first went
   * flaky. Delivery preserves order, so posting a sentinel *after* the
   * message under test and waiting for the sentinel proves the message
   * under test has already been handled, whether it was delivered or
   * dropped.
   */
  function flush(): Promise<void> {
    return new Promise((resolve) => {
      const stop = subscribe(TOPIC, (payload) => {
        if (payload.userId === SENTINEL.userId) {
          stop();
          resolve();
        }
      });
      otherTab.postMessage({ topic: TOPIC, payload: SENTINEL });
    });
  }

  /** Everything the subscriber saw, minus the sentinels used to synchronise. */
  function recorder(): { received: unknown[]; handler: (payload: unknown) => void } {
    const received: unknown[] = [];
    return {
      received,
      handler: (payload) => {
        if ((payload as { userId?: string })?.userId !== SENTINEL.userId) {
          received.push(payload);
        }
      },
    };
  }

  it("delivers a payload that matches this build's contract", async () => {
    const { received, handler } = recorder();
    unsubscribers.push(subscribe(TOPIC, handler));

    otherTab.postMessage({ topic: TOPIC, payload: PAYLOAD });
    await flush();

    expect(received).toEqual([PAYLOAD]);
  });

  it.each([
    ['a role this build does not have', { userId: 'user-1', newRole: 'superadmin' }],
    ['a missing userId', { newRole: 'editor' }],
    ['an empty userId', { userId: '', newRole: 'editor' }],
    ['a non-object payload', 'user-1 is now an editor'],
    ['null', null],
  ])('drops %s instead of delivering it as typed', async (_label, payload) => {
    const { received, handler } = recorder();
    unsubscribers.push(subscribe(TOPIC, handler));

    otherTab.postMessage({ topic: TOPIC, payload });
    await flush();

    expect(received).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('ignores a topic this build has never heard of, which a rollout produces', async () => {
    const { received, handler } = recorder();
    unsubscribers.push(subscribe(TOPIC, handler));

    otherTab.postMessage({ topic: 'user:promoted-to-wizard', payload: { userId: 'user-1' } });
    await flush();

    expect(received).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('does not know it'));
  });

  it('ignores a message that is not a bus message at all', async () => {
    const { received, handler } = recorder();
    unsubscribers.push(subscribe(TOPIC, handler));

    otherTab.postMessage('hello from an unrelated library on this origin');
    await flush();

    expect(received).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });
});
