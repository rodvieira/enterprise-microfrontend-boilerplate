import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RemoteBoundary } from '../src/remote-boundary';

function Explodes(): never {
  throw new Error('remote threw while rendering');
}

describe('RemoteBoundary', () => {
  it('contains a throw during render — not just a load failure — to the region it wraps', () => {
    // React logs the error boundary trace to console.error; silence it so the
    // run stays readable, restore after.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <div>
          <RemoteBoundary fallback={(error) => <p>Region failed: {error.message}</p>}>
            <Explodes />
          </RemoteBoundary>
          <span>Rest of the tree</span>
        </div>,
      );

      expect(screen.getByText('Region failed: remote threw while rendering')).toBeInTheDocument();
      expect(screen.getByText('Rest of the tree')).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('renders children normally when nothing throws', () => {
    render(
      <RemoteBoundary fallback={() => <p>Should not render</p>}>
        <p>All good</p>
      </RemoteBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });

  it('calls onError with the caught error, without taking a telemetry dependency itself', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    try {
      render(
        <RemoteBoundary fallback={() => <p>Failed</p>} onError={onError}>
          <Explodes />
        </RemoteBoundary>,
      );
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'remote threw while rendering' }),
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('lets the fallback retry, re-rendering children fresh', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    function MaybeExplodes() {
      if (shouldThrow) throw new Error('still failing');
      return <p>Recovered</p>;
    }

    try {
      render(
        <RemoteBoundary
          fallback={(error, retry) => (
            <button type="button" onClick={retry}>
              Retry: {error.message}
            </button>
          )}
        >
          <MaybeExplodes />
        </RemoteBoundary>,
      );
      expect(screen.getByRole('button', { name: /still failing/ })).toBeInTheDocument();

      shouldThrow = false;
      await userEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Recovered')).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });
});
