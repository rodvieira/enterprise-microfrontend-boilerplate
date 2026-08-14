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

  beforeEach(() => {
    otherTab = new BroadcastChannel('@enterprise-mfe/event-bus');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
    otherTab.close();
    vi.restoreAllMocks();
  });

  /** Lets the channel's async delivery run before asserting. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("delivers a payload that matches this build's contract", async () => {
    const handler = vi.fn();
    unsubscribers.push(subscribe(TOPIC, handler));

    otherTab.postMessage({ topic: TOPIC, payload: PAYLOAD });
    await settle();

    expect(handler).toHaveBeenCalledWith(PAYLOAD);
  });

  it.each([
    ['a role this build does not have', { userId: 'user-1', newRole: 'superadmin' }],
    ['a missing userId', { newRole: 'editor' }],
    ['an empty userId', { userId: '', newRole: 'editor' }],
    ['a non-object payload', 'user-1 is now an editor'],
    ['null', null],
  ])('drops %s instead of delivering it as typed', async (_label, payload) => {
    const handler = vi.fn();
    unsubscribers.push(subscribe(TOPIC, handler));

    otherTab.postMessage({ topic: TOPIC, payload });
    await settle();

    expect(handler).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('ignores a topic this build has never heard of, which a rollout produces', async () => {
    const handler = vi.fn();
    unsubscribers.push(subscribe(TOPIC, handler));

    otherTab.postMessage({ topic: 'user:promoted-to-wizard', payload: { userId: 'user-1' } });
    await settle();

    expect(handler).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('does not know it'));
  });

  it('ignores a message that is not a bus message at all', async () => {
    const handler = vi.fn();
    unsubscribers.push(subscribe(TOPIC, handler));

    otherTab.postMessage('hello from an unrelated library on this origin');
    await settle();

    expect(handler).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });
});
