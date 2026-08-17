import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REGISTRY_PATH = 'apps/shell/src/internal/federation/remotes.dev.json';
const ENTRY_URL_PATTERN = /^http:\/\/localhost:(\d+)\/mf-manifest\.json$/;

interface RemoteRegistration {
  name: string;
  entry: string;
  routePath: string;
  label: string;
}

interface DevRegistry {
  environment: 'dev';
  allowedOrigins: string[];
  remotes: RemoteRegistration[];
}

export interface RegisterDevRemoteOptions {
  repoRoot: string;
  name: string;
  routePath: string;
  label: string;
  /** Pre-computed by the caller (nextDevPort), so every write in a single
   * generation shares one port instead of each action re-deriving it from
   * a second, separately-timed read of remotes.dev.json. */
  port: number;
}

export interface RegisterDevRemoteResult {
  entry: string;
}

function readRegistry(repoRoot: string): DevRegistry {
  return JSON.parse(readFileSync(join(repoRoot, REGISTRY_PATH), 'utf8')) as DevRegistry;
}

/**
 * The next free port after every port already registered in
 * remotes.dev.json, starting from the shell's own dev port (3000) so a
 * first-ever remote still lands on 3001.
 */
export function nextDevPort(registry: Pick<DevRegistry, 'remotes'>): number {
  let highest = 3000;
  for (const remote of registry.remotes) {
    const match = remote.entry.match(ENTRY_URL_PATTERN);
    if (match?.[1]) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
  return highest + 1;
}

/**
 * Monorepo mode only. Appends one DevRegistryEntry and, if not
 * already present, one allowedOrigins entry for the assigned port — never
 * touches remotes.staging.json or remotes.production.json.
 */
export function registerDevRemote(options: RegisterDevRemoteOptions): RegisterDevRemoteResult {
  const registry = readRegistry(options.repoRoot);
  const entry = `http://localhost:${options.port}/mf-manifest.json`;
  const origin = `http://localhost:${options.port}`;

  registry.remotes.push({
    name: options.name,
    entry,
    routePath: options.routePath,
    label: options.label,
  });

  if (!registry.allowedOrigins.includes(origin)) {
    registry.allowedOrigins.push(origin);
  }

  writeFileSync(join(options.repoRoot, REGISTRY_PATH), `${JSON.stringify(registry, null, 2)}\n`);

  return { entry };
}
