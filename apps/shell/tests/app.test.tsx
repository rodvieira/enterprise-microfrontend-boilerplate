import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/exposed/App';

function mockRegistryResponse(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(body),
    }),
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the frame using @enterprise-mfe/ui, not shell-defined chrome', async () => {
    mockRegistryResponse({ environment: 'dev', allowedOrigins: [], remotes: [] });
    render(<App />);

    // The nav landmark and layout regions come from Layout/Nav in
    // @enterprise-mfe/ui — this asserts their real roles exist, not that some
    // div happens to look like navigation.
    await waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument());
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders normally and reports no error with an empty registry', async () => {
    mockRegistryResponse({ environment: 'dev', allowedOrigins: [], remotes: [] });
    render(<App />);

    await waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument());
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
});
