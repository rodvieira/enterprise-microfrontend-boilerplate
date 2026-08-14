import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface RemoteBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, retry: () => void) => ReactNode;
  /** So the shell can report the failure without this package taking a dependency on any telemetry package. */
  onError?: (error: Error) => void;
}

interface RemoteBoundaryState {
  error: Error | null;
}

/**
 * Contains a failure to the region it wraps. A remote that throws
 * during render — not only during load — must not propagate past this
 * boundary.
 *
 * A class component because React provides no hook equivalent for error
 * boundaries. This is a plain error boundary, not a loading state machine: it
 * has no `pending` concept of its own, because it never sees an unresolved
 * promise — useRemote already resolves loading and failed-to-load before its
 * `Component` is ever handed to this boundary to render. The only thing this
 * catches is a throw during that render.
 */
export class RemoteBoundary extends Component<RemoteBoundaryProps, RemoteBoundaryState> {
  override state: RemoteBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): RemoteBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onError?.(error);
  }

  private retry = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback(this.state.error, this.retry);
    }
    return this.props.children;
  }
}
