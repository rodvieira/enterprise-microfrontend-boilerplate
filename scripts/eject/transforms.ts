/**
 * The pure text transforms behind `pnpm eject`.
 *
 * Every function here is string-in/string-out so it can be unit-tested
 * without touching a real checkout — the orchestration in ../eject.ts owns
 * all the filesystem work.
 *
 * House rule for this module: **a transform that expected to change
 * something and did not must throw, never silently return the input.** An
 * eject runs once, against a repo the person is about to build their
 * company's platform on; a regex that quietly stopped matching after an
 * upstream edit would hand them a half-renamed repo and no signal.
 */

export class EjectTransformError extends Error {}

function required(condition: boolean, message: string): void {
  if (!condition) {
    throw new EjectTransformError(message);
  }
}

/** Escapes a literal for safe use inside a RegExp. */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * npm scope rules, narrowed to what this repo's own tooling can carry: the
 * scope is spliced into package names, import specifiers, Module Federation
 * `shared` keys, and an .npmrc registry line.
 */
const SCOPE_PATTERN = /^@[a-z0-9][a-z0-9-]*$/;

export function validateScope(scope: string): ValidationResult {
  if (!scope.startsWith('@')) {
    return { ok: false, reason: `"${scope}" must start with "@" (e.g. "@acme").` };
  }
  if (!SCOPE_PATTERN.test(scope)) {
    return {
      ok: false,
      reason: `"${scope}" is not a valid npm scope — use lowercase letters, digits, and hyphens after the "@" (e.g. "@acme", "@my-co").`,
    };
  }
  return { ok: true };
}

/**
 * Replaces every occurrence of the old scope. Deliberately a plain global
 * string replace rather than an import-aware transform: the scope shows up
 * in package.json names, import specifiers, MF `shared` keys, .npmrc,
 * generator templates, CI workflows, and prose — a syntax-aware rewrite
 * would need a parser per file type and would still miss the prose.
 */
export function renameScope(content: string, fromScope: string, toScope: string): string {
  return content.split(fromScope).join(toScope);
}

// ---------------------------------------------------------------------------
// ADR references
// ---------------------------------------------------------------------------

/**
 * Parenthetical ADR citations, which can be removed without touching the
 * surrounding sentence. Ordered longest-form first so the greedier patterns
 * match before the barer ones.
 *
 * Everything NOT listed here — most importantly prose-integrated forms like
 * "Per [ADR-0007](decisions/…), a remote is deployable on its own" — is left
 * exactly as it is and reported for a human instead. Stripping those needs
 * the sentence rewritten, and a regex that tries produces silent nonsense.
 */
const ADR_PARENTHETICALS: readonly RegExp[] = [
  // " (see [ADR-0012](docs/decisions/0012-x.md), FR-010)" / " (ADR-0008, FR-010)"
  /\s*\((?:see\s+)?(?:sprint\s+\d+,\s*)?(?:\[ADR-\d+\]\([^)]*\)|ADR-\d+)(?:\s*,\s*(?:\[ADR-\d+\]\([^)]*\)|ADR-\d+|FR-\d+|SC-\d+|research\s+D\d+))*\)/gi,
  // " — see [ADR-0012](…)." / " - see ADR-0012."  (clause at end of sentence)
  /\s*[—-]\s*see\s+(?:\[ADR-\d+\]\([^)]*\)|ADR-\d+)(?=[.,;]|\s*$)/gi,
];

/** A markdown link to an ADR file, reduced to its bare label. */
const ADR_LINK = /\[(ADR-\d+)\]\([^)]*\)/g;

export interface AdrFlattenResult {
  content: string;
  /** True when at least one reference survived and needs a human. */
  needsReview: boolean;
}

/**
 * Removes the mechanically-safe ADR citations and de-links the rest.
 *
 * De-linking matters on its own: once `docs/decisions/` is deleted, a
 * markdown link to it is a 404 for the reader, while the bare text
 * "ADR-0007" is merely a dangling reference the TODO report will point at.
 */
export function flattenAdrReferences(content: string): AdrFlattenResult {
  let next = content;
  for (const pattern of ADR_PARENTHETICALS) {
    next = next.replace(pattern, '');
  }
  next = next.replace(ADR_LINK, '$1');
  return { content: next, needsReview: /ADR-\d+/.test(next) };
}

// ---------------------------------------------------------------------------
// Manual-review report
// ---------------------------------------------------------------------------

export interface ReviewHit {
  file: string;
  line: number;
  text: string;
}

const REVIEW_PATTERNS: readonly RegExp[] = [/ADR-\d+/, /\bsprint \d+/i, /\bFR-\d{3}\b/];

/**
 * Every line still carrying a reference to something the eject deleted.
 * Reported rather than rewritten — see flattenAdrReferences.
 */
export function findReviewHits(content: string, file: string): ReviewHit[] {
  const hits: ReviewHit[] = [];
  content.split('\n').forEach((text, index) => {
    if (REVIEW_PATTERNS.some((pattern) => pattern.test(text))) {
      hits.push({ file, line: index + 1, text: text.trim() });
    }
  });
  return hits;
}

/** Lines naming an app the eject removed, which need prose attention. */
export function findRemovedAppHits(
  content: string,
  file: string,
  removedApps: readonly string[],
): ReviewHit[] {
  if (removedApps.length === 0) return [];
  const pattern = new RegExp(`\\b(${removedApps.map(escapeRegExp).join('|')})\\b`, 'i');
  const hits: ReviewHit[] = [];
  content.split('\n').forEach((text, index) => {
    if (pattern.test(text)) {
      hits.push({ file, line: index + 1, text: text.trim() });
    }
  });
  return hits;
}

// ---------------------------------------------------------------------------
// Config rewrites
// ---------------------------------------------------------------------------

/**
 * Swaps the example remotes' vitest projects for the new remote's, keeping
 * the shell's untouched.
 */
export function rewriteVitestProjects(
  content: string,
  removedApps: readonly string[],
  newRemote: string,
): string {
  const lines = content.split('\n');
  const kept: string[] = [];
  let removedCount = 0;
  let insertionIndex = -1;

  for (const line of lines) {
    const project = line.match(/browserProject\('([^']+)',\s*'\.\/apps\/([^']+)'\)/);
    if (project && removedApps.includes(project[2] as string)) {
      removedCount += 1;
      continue;
    }
    if (project?.[2] === 'shell') {
      insertionIndex = kept.length;
    }
    kept.push(line);
  }

  required(
    removedCount === removedApps.length,
    `rewriteVitestProjects: expected to remove ${removedApps.length} browserProject entr(ies), removed ${removedCount}.`,
  );
  required(insertionIndex >= 0, "rewriteVitestProjects: could not find the shell's own project.");

  const shellLine = kept[insertionIndex] as string;
  const indent = shellLine.match(/^\s*/)?.[0] ?? '      ';
  kept.splice(
    insertionIndex + 1,
    0,
    `${indent}browserProject('${newRemote}', './apps/${newRemote}'),`,
  );
  return kept.join('\n');
}

/**
 * Replaces the example remotes' dev servers in Playwright's `webServer`
 * array with a single entry for the new remote.
 */
export function rewritePlaywrightWebServers(
  content: string,
  removedApps: readonly string[],
  options: { scope: string; name: string; port: number },
): string {
  let next = content;
  let removedCount = 0;

  for (const app of removedApps) {
    const entry = new RegExp(
      `\\n\\s*\\{\\s*\\n(?:[^{}]*\\n)*?\\s*command: '[^']*--filter [^']*\\/${escapeRegExp(app)} dev',\\n(?:[^{}]*\\n)*?\\s*\\},`,
      'g',
    );
    const before = next;
    next = next.replace(entry, '');
    if (next !== before) removedCount += 1;
  }

  required(
    removedCount === removedApps.length,
    `rewritePlaywrightWebServers: expected to remove ${removedApps.length} webServer entr(ies), removed ${removedCount}.`,
  );

  // Append the new remote's server after the shell's entry, cloning the
  // shape already in the file rather than inventing a second one.
  const shellEntry =
    /\n\s*\{\s*\n\s*command: '[^']*--filter [^']*\/shell dev',\n(?:[^{}]*\n)*?\s*\},/;
  const match = next.match(shellEntry);
  if (match === null) {
    throw new EjectTransformError(
      "rewritePlaywrightWebServers: could not find the shell's webServer entry.",
    );
  }

  const shellBlock = match[0];
  const newBlock = shellBlock
    .replace(/--filter [^']*\/shell dev/, `--filter ${options.scope}/${options.name} dev`)
    .replace(/localhost:\d+/, `localhost:${options.port}`);

  return next.replace(shellBlock, `${shellBlock}${newBlock}`);
}

/** Swaps removed app names out of commitlint's scope-enum for the new remote. */
export function rewriteCommitlintScopes(
  content: string,
  removedApps: readonly string[],
  newRemote: string,
): string {
  const lines = content.split('\n');
  const kept: string[] = [];
  let removedCount = 0;
  let firstRemovalIndex = -1;

  for (const line of lines) {
    const entry = line.match(/^\s*'([^']+)',\s*$/);
    if (entry && removedApps.includes(entry[1] as string)) {
      if (firstRemovalIndex < 0) {
        firstRemovalIndex = kept.length;
        const indent = line.match(/^\s*/)?.[0] ?? '        ';
        kept.push(`${indent}'${newRemote}',`);
      }
      removedCount += 1;
      continue;
    }
    kept.push(line);
  }

  required(
    removedCount === removedApps.length,
    `rewriteCommitlintScopes: expected to remove ${removedApps.length} scope(s), removed ${removedCount}.`,
  );
  return kept.join('\n');
}

/**
 * Rewrites the Pages deploy so it builds and assembles the new remote
 * instead of the two examples.
 */
export function rewriteDeployWorkflow(
  content: string,
  removedApps: readonly string[],
  options: { scope: string; name: string },
): string {
  let next = content;
  let removedSteps = 0;

  for (const app of removedApps) {
    const step = new RegExp(
      `\\n\\s*- name: Build ${escapeRegExp(app)} remote\\n\\s*run: [^\\n]*\\n`,
      'i',
    );
    const before = next;
    next = next.replace(step, '\n');
    if (next !== before) removedSteps += 1;
  }
  required(
    removedSteps === removedApps.length,
    `rewriteDeployWorkflow: expected to remove ${removedApps.length} build step(s), removed ${removedSteps}.`,
  );

  // One build step for the new remote, placed before the shell's.
  const shellStep = /(\n(\s*)- name: Build shell \(production\)\n)/;
  required(shellStep.test(next), "rewriteDeployWorkflow: could not find the shell's build step.");
  next = next.replace(
    shellStep,
    (_full, whole: string, indent: string) =>
      `\n${indent}- name: Build ${options.name} remote\n${indent}  run: pnpm --filter ${options.scope}/${options.name} run build\n${whole.replace(/^\n/, '')}`,
  );

  // Assemble block: one mkdir/cp pair per remote.
  const mkdir = /^(\s*)mkdir -p .*$/m;
  required(mkdir.test(next), 'rewriteDeployWorkflow: could not find the mkdir line.');
  next = next.replace(
    mkdir,
    (_full, indent: string) => `${indent}mkdir -p _site/remotes/${options.name}`,
  );

  for (const app of removedApps) {
    const copy = new RegExp(`^\\s*cp -r apps/${escapeRegExp(app)}/dist/\\..*$\\n`, 'm');
    next = next.replace(copy, '');
  }
  const shellCopy = /^(\s*)(cp -r apps\/shell\/dist\/\. _site\/)$/m;
  required(shellCopy.test(next), 'rewriteDeployWorkflow: could not find the shell copy line.');
  next = next.replace(
    shellCopy,
    (_full, indent: string, line: string) =>
      `${indent}${line}\n${indent}cp -r apps/${options.name}/dist/. _site/remotes/${options.name}/`,
  );

  return next;
}

// ---------------------------------------------------------------------------
// Registries
// ---------------------------------------------------------------------------

export interface RemoteRegistry {
  environment: string;
  basePath?: string;
  allowedOrigins: string[];
  remotes: unknown[];
}

/**
 * Empties a registry's remotes. Used on remotes.dev.json *before* generating
 * the first remote — so the generator's own nextDevPort assigns it 3001
 * rather than the next port after the examples — and on the staging and
 * production registries, whose URLs belong to whoever ejected.
 *
 * `basePath` is dropped rather than kept: it names the path the shell is
 * served under, which in this repo is its own GitHub Pages project path.
 * Carrying that into someone else's repo is worse than having no value at
 * all — the shell would resolve every asset under a directory named after
 * this boilerplate and 404 with no obvious cause. Absent, the build falls
 * back to '/' (apps/shell/rspack.config.ts).
 */
export function emptyRegistry(
  registry: RemoteRegistry,
  options: { keepOrigins: boolean },
): RemoteRegistry {
  const { basePath: _dropped, ...rest } = registry;
  return {
    ...rest,
    allowedOrigins: options.keepOrigins ? registry.allowedOrigins : [],
    remotes: [],
  };
}

export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
