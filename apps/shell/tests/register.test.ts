import { beforeEach, describe, expect, it, vi } from 'vitest';
import { describeRemote } from '../src/internal/federation/register';
import type { RemoteRegistry } from '../src/internal/federation/types';

const { registerRemotesMock } = vi.hoisted(() => ({ registerRemotesMock: vi.fn() }));

vi.mock('@module-federation/enhanced/runtime', () => ({
  registerRemotes: registerRemotesMock,
}));

async function importRegisterAllowedRemotes() {
  return (await import('../src/internal/federation/register')).registerAllowedRemotes;
}

describe('registerAllowedRemotes', () => {
  beforeEach(() => {
    registerRemotesMock.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('drops a refused remote before registerRemotes is ever called for it — it never reaches load state', async () => {
    const registerAllowedRemotes = await importRegisterAllowedRemotes();
    const registry: RemoteRegistry = {
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
    };

    const outcome = await registerAllowedRemotes(registry);

    expect(outcome.registered.map((r) => r.name)).toEqual(['dashboard']);
    expect(outcome.refused).toHaveLength(1);
    expect(outcome.refused[0]).toMatchObject({ reason: 'origin-not-allowed' });
    expect(outcome.refused[0]?.registration.name).toBe('evil');

    // Only the allowed remote was ever handed to the MF runtime.
    expect(registerRemotesMock).toHaveBeenCalledTimes(1);
    expect(registerRemotesMock).toHaveBeenCalledWith([
      { name: 'dashboard', entry: 'http://localhost:3001/mf-manifest.json' },
    ]);
  });

  it('calls registerRemotes with nothing when every remote is refused, rather than calling it empty', async () => {
    const registerAllowedRemotes = await importRegisterAllowedRemotes();
    const registry: RemoteRegistry = {
      environment: 'dev',
      allowedOrigins: [],
      remotes: [
        {
          name: 'evil',
          entry: 'https://evil.example/mf-manifest.json',
          routePath: '/evil',
          label: 'Evil',
        },
      ],
    };

    const outcome = await registerAllowedRemotes(registry);

    expect(outcome.registered).toHaveLength(0);
    expect(outcome.refused).toHaveLength(1);
    expect(registerRemotesMock).not.toHaveBeenCalled();
  });
});

describe('describeRemote', () => {
  it('names the version when the registry states one', () => {
    expect(
      describeRemote({
        name: 'dashboard',
        entry: 'https://cdn.example/d/mf-manifest.json',
        routePath: '/dashboard',
        label: 'Dashboard',
        version: '1.4.2',
      }),
    ).toBe('dashboard@1.4.2');
  });

  it('falls back to the bare name rather than inventing a version', () => {
    expect(
      describeRemote({
        name: 'dashboard',
        entry: 'http://localhost:3001/mf-manifest.json',
        routePath: '/dashboard',
        label: 'Dashboard',
      }),
    ).toBe('dashboard');
  });
});
