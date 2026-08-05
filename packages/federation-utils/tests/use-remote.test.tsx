import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemote } from '../src/use-remote';
import type { RemoteLoader } from '../src/use-remote';

function Probe({
  loader,
  timeoutMs,
}: { loader: RemoteLoader<Record<string, never>>; timeoutMs?: number }) {
  const { Component, state, error, retry } = useRemote(
    loader,
    timeoutMs === undefined ? {} : { timeoutMs },
  );
  return (
    <div>
      <span data-testid="state">{state}</span>
      <span data-testid="error">{error?.message ?? 'none'}</span>
      {state === 'loading' ? <span data-testid="pending">Loading…</span> : null}
      {state === 'loaded' && Component ? <Component /> : null}
      <button type="button" onClick={retry}>
        Retry
      </button>
      <span data-testid="sibling">Rest of the tree</span>
    </div>
  );
}

describe('useRemote', () => {
  it('resolves to loaded when the loader succeeds', async () => {
    const loader: RemoteLoader<Record<string, never>> = () =>
      Promise.resolve({ default: () => <p>Remote content</p> });
    render(<Probe loader={loader} />);

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('loaded'));
    expect(screen.getByText('Remote content')).toBeInTheDocument();
  });

  it('a loader that rejects resolves to failed, exposes the reason, and the rest of the tree stays rendered', async () => {
    const loader: RemoteLoader<Record<string, never>> = () =>
      Promise.reject(new Error('remote unreachable'));
    render(<Probe loader={loader} />);

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('failed'));
    expect(screen.getByTestId('error')).toHaveTextContent('remote unreachable');
    expect(screen.getByTestId('sibling')).toHaveTextContent('Rest of the tree');
  });

  it('a loader that never settles resolves to failed after timeoutMs, not a permanent loading state', async () => {
    vi.useFakeTimers();
    try {
      const loader: RemoteLoader<Record<string, never>> = () => new Promise(() => {});
      render(<Probe loader={loader} timeoutMs={1000} />);

      expect(screen.getByTestId('state')).toHaveTextContent('loading');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(screen.getByTestId('state')).toHaveTextContent('failed');
      expect(screen.getByTestId('error')).toHaveTextContent(/timed out/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a module with no usable default export resolves to failed, not loaded with an empty region', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: deliberately malformed module shape under test
    const loader = (() => Promise.resolve({} as any)) as RemoteLoader<Record<string, never>>;
    render(<Probe loader={loader} />);

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('failed'));
    expect(screen.getByTestId('error')).toHaveTextContent(/default export/i);
  });

  it('shows a distinct in-progress element while loading, never a blank region', () => {
    const loader: RemoteLoader<Record<string, never>> = () => new Promise(() => {});
    render(<Probe loader={loader} />);

    // By the time render() returns, the effect that kicks off the load has
    // already run — state is 'loading', not the initial 'idle'.
    expect(screen.getByTestId('state')).toHaveTextContent('loading');
    expect(screen.getByTestId('pending')).toHaveTextContent('Loading…');
  });

  describe('retry', () => {
    // Real timers here: the loader below settles on its own microtask queue,
    // and mixing fake timers with userEvent's internal scheduling is a known
    // way to deadlock a test — the timeout path above is what needs faking.
    it('returns state from failed to loading without the component unmounting', async () => {
      let attempt = 0;
      const loader: RemoteLoader<Record<string, never>> = () => {
        attempt += 1;
        return attempt === 1
          ? Promise.reject(new Error('first attempt fails'))
          : Promise.resolve({ default: () => <p>Recovered</p> });
      };

      render(<Probe loader={loader} />);
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('failed'));

      await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(screen.getByTestId('sibling')).toBeInTheDocument(); // never unmounted

      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('loaded'));
      expect(screen.getByText('Recovered')).toBeInTheDocument();
    });
  });
});
