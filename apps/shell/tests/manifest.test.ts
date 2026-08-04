import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistryError, fetchRegistry } from '../src/internal/federation/manifest';

function mockFetch(impl: () => Promise<Partial<Response>>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

describe('fetchRegistry', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('fails naming the file when the registry cannot be fetched (404)', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 404 }));

    await expect(fetchRegistry()).rejects.toThrow(RegistryError);
    await expect(fetchRegistry()).rejects.toThrow(/remotes\.json/);
    await expect(fetchRegistry()).rejects.toThrow(/404/);
  });

  it('fails naming the file when the network request itself fails', async () => {
    mockFetch(() => Promise.reject(new Error('network down')));

    await expect(fetchRegistry()).rejects.toThrow(/remotes\.json/);
    await expect(fetchRegistry()).rejects.toThrow(/network down/);
  });

  it('fails the same way when the body is not valid JSON (malformed)', async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    );

    await expect(fetchRegistry()).rejects.toThrow(/remotes\.json/);
    await expect(fetchRegistry()).rejects.toThrow(/not valid JSON/);
  });

  it('reports two remotes sharing a name as a conflict, never resolved last-wins', async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            environment: 'dev',
            allowedOrigins: [],
            remotes: [
              {
                name: 'dashboard',
                entry: 'https://a.example/mf-manifest.json',
                routePath: '/a',
                label: 'A',
              },
              {
                name: 'dashboard',
                entry: 'https://b.example/mf-manifest.json',
                routePath: '/b',
                label: 'B',
              },
            ],
          }),
      }),
    );

    await expect(fetchRegistry()).rejects.toThrow(/"dashboard"/);
    await expect(fetchRegistry()).rejects.toThrow(/environment: dev/);
  });

  it('reports a routePath colliding with a host-owned route, naming both', async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            environment: 'dev',
            allowedOrigins: [],
            remotes: [
              {
                name: 'dashboard',
                entry: 'https://a.example/mf-manifest.json',
                routePath: '/settings',
                label: 'Dashboard',
              },
            ],
          }),
      }),
    );

    await expect(fetchRegistry(['/settings'])).rejects.toThrow(/"dashboard"/);
    await expect(fetchRegistry(['/settings'])).rejects.toThrow(/"\/settings"/);
    await expect(fetchRegistry(['/settings'])).rejects.toThrow(/the shell itself/);
  });

  it('accepts an empty registry — zero remotes is a valid state', async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ environment: 'dev', allowedOrigins: [], remotes: [] }),
      }),
    );

    await expect(fetchRegistry()).resolves.toEqual({
      environment: 'dev',
      allowedOrigins: [],
      remotes: [],
    });
  });
});
