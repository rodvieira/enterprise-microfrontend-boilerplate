import { isEnvironment } from './types';

const KNOWN_ENVIRONMENTS = ['dev', 'staging', 'production'] as const;

export class UnknownEnvironmentError extends Error {}

/**
 * Resolves which registry source file the build should copy to
 * `remotes.json` for the given `FEDERATION_ENV` value.
 *
 * A pure function of (env, fileExists), so the two failures worth getting
 * right — an unknown environment, and an environment naming a file that
 * doesn't exist — are unit-testable without touching the real filesystem or
 * the real rspack build. `rspack.config.ts` calls this with `existsSync`;
 * tests call it with a fake.
 */
export function resolveRegistrySourcePath(
  federationEnv: string | undefined,
  fileExists: (path: string) => boolean,
): string {
  // No configuration required to start: dev is the default.
  const env = federationEnv ?? 'dev';

  if (!isEnvironment(env)) {
    throw new UnknownEnvironmentError(
      `FEDERATION_ENV="${env}" is not one of ${KNOWN_ENVIRONMENTS.join(', ')}. ` +
        `Expected a registry file at ./src/internal/federation/remotes.${env}.json.`,
    );
  }

  const path = `./src/internal/federation/remotes.${env}.json`;
  if (!fileExists(path)) {
    throw new UnknownEnvironmentError(
      `no registry file for environment "${env}" — expected ${path} to exist.`,
    );
  }

  return path;
}
