import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/exposed/App';

function mockRegistryResponse() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ environment: 'dev', allowedOrigins: [], remotes: [] }),
    }),
  );
}

describe('session', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    mockRegistryResponse();
  });

  it('reaches a protected area and shows the signed-in person after signing in', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument());

    // Signed out: the protected area's fallback is visible, not its content.
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
  });
});
