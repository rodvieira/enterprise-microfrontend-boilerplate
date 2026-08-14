import type { ComponentType } from 'react';
import { useCallback, useEffect, useState } from 'react';

/**
 * The same shape React.lazy accepts, so a caller can pass a dynamic import
 * directly. Deliberately bundler-agnostic: this package knows
 * nothing about Module Federation, so every failure mode below is testable
 * with a plain rejecting/hanging promise, before any real remote exists.
 */
export type RemoteLoader<T> = () => Promise<{ default: ComponentType<T> }>;

export type RemoteLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

export interface UseRemoteOptions {
  /** Milliseconds before a load is treated as failed. Default 10000. */
  timeoutMs?: number;
}

export interface UseRemoteResult<T> {
  Component: ComponentType<T> | null;
  state: RemoteLoadState;
  error: Error | null;
  retry: () => void;
}

const DEFAULT_TIMEOUT_MS = 10_000;

function isUsableModule<T>(module: unknown): module is { default: ComponentType<T> } {
  return (
    typeof module === 'object' &&
    module !== null &&
    'default' in module &&
    typeof (module as { default: unknown }).default === 'function'
  );
}

export function useRemote<T>(
  loader: RemoteLoader<T>,
  options: UseRemoteOptions = {},
): UseRemoteResult<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const [state, setState] = useState<RemoteLoadState>('idle');
  const [Component, setComponent] = useState<ComponentType<T> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  // Bumping this re-runs the load effect — the mechanism behind retry().
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `loader` is expected to be stable per mount/attempt, the same contract React.lazy relies on — including it would re-trigger the load on every render of an inline arrow-function loader. `attempt` is deliberately a dependency: bumping it is how retry() re-runs this effect.
  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setError(null);

    const timer = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      setError(new Error(`Remote load timed out after ${timeoutMs}ms.`));
      setState('failed');
    }, timeoutMs);

    loader()
      .then((module) => {
        if (cancelled) return;
        clearTimeout(timer);
        if (!isUsableModule<T>(module)) {
          setError(new Error('Remote module has no usable default export.'));
          setState('failed');
          return;
        }
        setComponent(() => module.default);
        setState('loaded');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        clearTimeout(timer);
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setState('failed');
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt, timeoutMs]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { Component, state, error, retry };
}
