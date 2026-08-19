import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/exposed/App';

const { registerRemotesMock } = vi.hoisted(() => ({ registerRemotesMock: vi.fn() }));

vi.mock('@module-federation/enhanced/runtime', () => ({
  registerRemotes: registerRemotesMock,
}));

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
    registerRemotesMock.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders the frame using the shell chrome, not markup invented per route', async () => {
    mockRegistryResponse({ environment: 'dev', allowedOrigins: [], remotes: [] });
    render(<App />);

    // The nav landmark and layout regions come from Layout/Nav in
    // internal/chrome — this asserts their real roles exist, not that some
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

  it('renders unaffected when the registry mixes a refused remote with an allowed one', async () => {
    mockRegistryResponse({
      environment: 'dev',
      allowedOrigins: ['http://localhost:3001'],
      remotes: [
        {
          name: 'dashboard',
          entry: 'http://localhost:3001/mf-manifest.json',
          routePath: '/dashboard',
          label: 'Dashboard',
        },
        {
          name: 'evil',
          entry: 'https://evil.example/mf-manifest.json',
          routePath: '/evil',
          label: 'Evil',
        },
      ],
    });
    render(<App />);

    await waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument());
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();

    // The refusal is decided and logged, not silently absent —
    // but it never crashes the frame, and only the allowed remote reaches the
    // MF runtime.
    await waitFor(() => expect(registerRemotesMock).toHaveBeenCalledTimes(1));
    expect(registerRemotesMock).toHaveBeenCalledWith([
      { name: 'dashboard', entry: 'http://localhost:3001/mf-manifest.json' },
    ]);
  });
});
