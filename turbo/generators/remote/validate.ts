import { isAbsolute, resolve, sep } from 'node:path';

/**
 * Mirrors apps/shell/src/internal/routes/remote-routes.tsx's
 * HOST_OWNED_ROUTE_PATHS. Not imported directly: that file lives under an
 * app's src/internal/, which no code outside that app may import from
 * (enforced by .dependency-cruiser.js) — the generator reuses
 * the same *semantics*, per generator-contract.md, not the literal module.
 */
export const HOST_OWNED_ROUTE_PATHS: readonly string[] = ['/'];

/** apps/shell is the only app name the shell itself can never share. */
const RESERVED_NAMES: readonly string[] = ['shell'];

/**
 * A legal npm package-name segment, restricted further to what this
 * project's own apps/* already use: lowercase letters, digits, and hyphens,
 * starting with a letter.
 */
const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Same shape as NAME_PATTERN, applied to each "/"-separated route segment. */
const ROUTE_SEGMENT_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * write-app.ts splices routePath/label raw into generated source (JSX text,
 * a `label="{{title}}"` attribute, JSDoc comments) via plain string
 * substitution, not an escaping template engine — so both must be
 * restricted to characters that can't break out of those contexts: no `"`,
 * backtick, `<`, `>`, `{`, `}`, or a star followed by a slash.
 */
const LABEL_PATTERN = /^[\w .,'&\/-]+$/;

export interface ValidationResult {
  ok: boolean;
  /** Present when ok is false — the specific, printable refusal reason. */
  reason?: string;
}

const valid: ValidationResult = { ok: true };

export function validateName(name: string, existingAppNames: readonly string[]): ValidationResult {
  if (name.length === 0) {
    return { ok: false, reason: 'Remote name must not be empty.' };
  }
  if (!NAME_PATTERN.test(name)) {
    return {
      ok: false,
      reason: `"${name}" is not a valid remote name — use lowercase letters, digits, and hyphens, starting with a letter (e.g. "billing", "user-settings").`,
    };
  }
  if (RESERVED_NAMES.includes(name)) {
    return { ok: false, reason: `"${name}" is reserved — the shell itself uses this name.` };
  }
  if (existingAppNames.includes(name)) {
    return { ok: false, reason: `apps/${name} already exists — choose a different name.` };
  }
  return valid;
}

export function validateRoutePath(
  routePath: string,
  existingRoutePaths: readonly string[],
): ValidationResult {
  if (!routePath.startsWith('/')) {
    return { ok: false, reason: `"${routePath}" must start with "/".` };
  }
  if (routePath !== '/' && routePath.endsWith('/')) {
    return { ok: false, reason: `"${routePath}" must not have a trailing slash.` };
  }
  const segments = routePath.split('/').filter(Boolean);
  const invalidSegment = segments.find((segment) => !ROUTE_SEGMENT_PATTERN.test(segment));
  if (invalidSegment) {
    return {
      ok: false,
      reason: `"${routePath}" has an invalid segment ("${invalidSegment}") — each "/"-separated segment must be lowercase letters, digits, and hyphens, starting with a letter.`,
    };
  }
  const owner = [...HOST_OWNED_ROUTE_PATHS, ...existingRoutePaths].includes(routePath);
  if (owner) {
    return {
      ok: false,
      reason: `"${routePath}" is already in use — pick a route path no other remote or the shell itself owns.`,
    };
  }
  return valid;
}

export function validateLabel(label: string): ValidationResult {
  if (label.trim().length === 0) {
    return { ok: false, reason: 'Label must not be empty.' };
  }
  if (!LABEL_PATTERN.test(label)) {
    return {
      ok: false,
      reason: `"${label}" contains a character that isn't allowed in a label — use letters, digits, spaces, and basic punctuation (- , . ' & /) only.`,
    };
  }
  return valid;
}

/**
 * Standalone mode only: the output path must resolve
 * outside the monorepo root the generator is running from.
 */
export function validateOutputPathOutsideRepo(
  outputPath: string,
  repoRoot: string,
): ValidationResult {
  const resolvedTarget = resolve(repoRoot, outputPath);
  const resolvedRoot = resolve(repoRoot);
  if (resolvedTarget === resolvedRoot || resolvedTarget.startsWith(resolvedRoot + sep)) {
    return {
      ok: false,
      reason: `"${outputPath}" resolves inside the monorepo (${resolvedRoot}) — standalone output must live outside it.`,
    };
  }
  if (!isAbsolute(resolvedTarget)) {
    return { ok: false, reason: `"${outputPath}" could not be resolved to an absolute path.` };
  }
  return valid;
}

/**
 * The "generation interrupted partway" case: refuse to
 * write over a pre-existing directory — empty or not — rather than
 * attempting to detect and repair a partial previous run.
 */
export function validateOutputDirAvailable(
  targetPath: string,
  alreadyExists: boolean,
): ValidationResult {
  if (alreadyExists) {
    return {
      ok: false,
      reason: `"${targetPath}" already exists — refusing to write into or over it.`,
    };
  }
  return valid;
}
