import type { RemoteRegistration, RemoteRegistry } from './types';
import { isEnvironment } from './types';

const REGISTRY_URL = '/remotes.json';

/**
 * A registry that failed validation. Always names REGISTRY_URL, and includes
 * the environment field when the document was parseable enough to have one —
 * satisfying FR-009's requirement to name the file and the environment.
 */
export class RegistryError extends Error {}

function fail(reason: string): never {
  throw new RegistryError(`${REGISTRY_URL}: ${reason}`);
}

/**
 * A route the host owns and mounts itself, independent of any remote.
 * Checked against every registration's routePath (spec edge case, US2
 * scenario 3) — collisions are a startup-time configuration error, not a
 * silent overwrite discovered by whichever route rendered last.
 */
function assertNoRoutePathCollisions(
  remotes: readonly RemoteRegistration[],
  hostOwnedRoutePaths: readonly string[],
): void {
  const seen = new Map<string, string>(); // routePath -> owner name
  for (const path of hostOwnedRoutePaths) {
    seen.set(path, '(the shell itself)');
  }
  for (const remote of remotes) {
    const owner = seen.get(remote.routePath);
    if (owner) {
      fail(
        `remote "${remote.name}" registers routePath "${remote.routePath}", ` +
          `which is already owned by ${owner}.`,
      );
    }
    seen.set(remote.routePath, `remote "${remote.name}"`);
  }
}

function assertNoDuplicateNames(remotes: readonly RemoteRegistration[]): void {
  const seen = new Set<string>();
  for (const remote of remotes) {
    if (seen.has(remote.name)) {
      fail(
        `two remotes are both registered under the name "${remote.name}". Duplicate names are never resolved last-wins — rename one.`,
      );
    }
    seen.add(remote.name);
  }
}

function validate(document: unknown, hostOwnedRoutePaths: readonly string[]): RemoteRegistry {
  if (typeof document !== 'object' || document === null) {
    fail('expected a JSON object at the top level.');
  }
  const record = document as Record<string, unknown>;

  if (!isEnvironment(record.environment)) {
    fail(
      `"environment" is ${JSON.stringify(record.environment)}, expected one of "dev", "staging", "production".`,
    );
  }
  if (!Array.isArray(record.allowedOrigins)) {
    fail('"allowedOrigins" must be an array (it may be empty).');
  }
  if (!Array.isArray(record.remotes)) {
    fail('"remotes" must be an array (it may be empty — zero remotes is a valid state).');
  }

  const registry: RemoteRegistry = {
    environment: record.environment,
    allowedOrigins: record.allowedOrigins as readonly string[],
    remotes: record.remotes as readonly RemoteRegistration[],
  };

  assertNoDuplicateNames(registry.remotes);
  assertNoRoutePathCollisions(registry.remotes, hostOwnedRoutePaths);

  return registry;
}

/**
 * Fetches and validates the registry the running host was deployed with.
 * Never re-fetched after startup — a registry change is a deployment, not a
 * runtime event (research D3).
 */
export async function fetchRegistry(
  hostOwnedRoutePaths: readonly string[] = [],
): Promise<RemoteRegistry> {
  let response: Response;
  try {
    response = await fetch(REGISTRY_URL);
  } catch (cause) {
    fail(`could not be fetched (${(cause as Error).message}).`);
  }

  if (!response.ok) {
    fail(`fetch returned HTTP ${response.status}.`);
  }

  let document: unknown;
  try {
    document = await response.json();
  } catch {
    fail('response body is not valid JSON.');
  }

  return validate(document, hostOwnedRoutePaths);
}
