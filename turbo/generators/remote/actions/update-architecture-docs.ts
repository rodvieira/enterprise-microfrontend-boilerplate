import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DOCS_PATH = 'docs/architecture.md';
const SECTION_HEADING = '## Remotes';

export interface UpdateArchitectureDocsOptions {
  repoRoot: string;
  name: string;
  label: string;
}

/**
 * Monorepo mode only (FR-011). Appends one sentence to docs/architecture.md's
 * "## Remotes" section — prose, matching its existing style, not a new list
 * or table structure (data-model.md's DocsEntry).
 */
export function updateArchitectureDocs(options: UpdateArchitectureDocsOptions): void {
  const docsPath = join(options.repoRoot, DOCS_PATH);
  const content = readFileSync(docsPath, 'utf8');

  const sectionStart = content.indexOf(SECTION_HEADING);
  if (sectionStart === -1) {
    throw new Error(
      `update-architecture-docs: could not find "${SECTION_HEADING}" in ${DOCS_PATH}.`,
    );
  }

  const nextHeadingIndex = content.indexOf('\n## ', sectionStart + SECTION_HEADING.length);
  const insertAt = nextHeadingIndex === -1 ? content.length : nextHeadingIndex;

  const sentence =
    `\n\`apps/${options.name}\` was scaffolded via \`pnpm turbo gen remote\` ` +
    `(ADR-0014) — registered in the dev environment as "${options.label}".\n`;

  const updated = `${content.slice(0, insertAt)}${sentence}${content.slice(insertAt)}`;
  writeFileSync(docsPath, updated);
}
