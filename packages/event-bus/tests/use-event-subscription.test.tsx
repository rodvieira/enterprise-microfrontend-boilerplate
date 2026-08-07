import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { publish } from '../src/bus';
import type { RoleChangedEvent } from '../src/event-map';
import { useEventSubscription } from '../src/use-event-subscription';

const TOPIC = 'user:role-changed' as const;
const PAYLOAD: RoleChangedEvent = { userId: 'user-1', newRole: 'editor' };

function Subscriber({ onEvent }: { onEvent: (payload: RoleChangedEvent) => void }) {
  useEventSubscription(TOPIC, onEvent);
  return null;
}

describe('useEventSubscription', () => {
  it('subscribes on mount', () => {
    const onEvent = vi.fn();
    render(<Subscriber onEvent={onEvent} />);

    publish(TOPIC, PAYLOAD);

    expect(onEvent).toHaveBeenCalledWith(PAYLOAD);
  });

  it('unsubscribes on unmount', () => {
    const onEvent = vi.fn();
    const { unmount } = render(<Subscriber onEvent={onEvent} />);
    unmount();

    publish(TOPIC, PAYLOAD);

    expect(onEvent).not.toHaveBeenCalled();
  });
});
