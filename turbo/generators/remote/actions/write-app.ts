import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readSharedVersions, readToolVersions } from '../shared-versions';
import type { GeneratorMode } from '../types';

const TEMPLATE_SUFFIX = '.template';

export interface WriteAppOptions {
  mode: GeneratorMode;
  name: string;
  routePath: string;
  label: string;
  port: number;
  /** Absolute path to the monorepo root — where packages/* and apps/dashboard live. */
  repoRoot: string;
  /** Absolute path the app gets written to (apps/<name>, or a standalone outputPath). */
  targetDir: string;
}

export interface WriteAppResult {
  filesCreated: readonly string[];
}

function renderTemplate(source: string, vars: Readonly<Record<string, string>>): string {
  let rendered = source;
  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.split(`{{${key}}}`).join(value);
  }
  return rendered;
}

function copyTemplateDir(
  srcDir: string,
  destDir: string,
  vars: Readonly<Record<string, string>>,
  filesCreated: string[],
): void {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name);
    if (entry.isDirectory()) {
      copyTemplateDir(srcPath, join(destDir, entry.name), vars, filesCreated);
      continue;
    }
    if (!entry.name.endsWith(TEMPLATE_SUFFIX)) {
      continue;
    }
    const destPath = join(destDir, entry.name.slice(0, -TEMPLATE_SUFFIX.length));
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, renderTemplate(readFileSync(srcPath, 'utf8'), vars));
    filesCreated.push(destPath);
  }
}

/**
 * Standalone mode's published dependency ranges (FR-017): read directly
 * from each packages/* manifest's own "version" field. Correct by
 * construction regardless of whether a publish has happened yet — see
 * package-publish-contract.md.
 */
function publishedRange(repoRoot: string, packageDirName: string): string {
  const manifestPath = join(repoRoot, 'packages', packageDirName, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version: string };
  return `^${manifest.version}`;
}

/**
 * Standalone mode has no root package.json to hoist `typescript` from
 * (unlike monorepo mode, which relies on the workspace root's), so its own
 * package.json needs an explicit devDependency — read live from this
 * repo's own root manifest rather than hardcoded, same reasoning as
 * shared-versions.ts.
 */
function readRootTypescriptVersion(repoRoot: string): string {
  const manifestPath = join(repoRoot, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    devDependencies?: Record<string, string>;
  };
  const version = manifest.devDependencies?.typescript;
  if (!version) {
    throw new Error(`write-app: root package.json is missing a "typescript" devDependency.`);
  }
  return version;
}

/**
 * Renders templates/common/ + templates/<mode>/ into options.targetDir.
 * Assumes every validation check (name, route, output-dir availability)
 * already ran during prompt collection (FR-014) — this function only
 * writes.
 */
export function writeApp(options: WriteAppOptions): WriteAppResult {
  const filesCreated: string[] = [];
  const shared = readSharedVersions(options.repoRoot);
  const tools = readToolVersions(options.repoRoot);
  const templatesRoot = join(options.repoRoot, 'turbo', 'generators', 'remote', 'templates');

  const vars: Record<string, string> = {
    name: options.name,
    packageName: `@enterprise-mfe/${options.name}`,
    // Module Federation's default 'var' library type needs a valid JS
    // identifier — kebab-case names (this repo's convention) aren't one.
    federationLibraryName: options.name.replace(/-/g, '_'),
    title: options.label,
    routePath: options.routePath,
    port: String(options.port),
    reactVersion: shared.react,
    reactDomVersion: shared['react-dom'],
    reactRouterVersion: shared['react-router'],
    moduleFederationVersion: tools['@module-federation/enhanced'],
    rspackCliVersion: tools['@rspack/cli'],
    rspackCoreVersion: tools['@rspack/core'],
    rspackDevServerVersion: tools['@rspack/dev-server'],
    tailwindPostcssVersion: tools['@tailwindcss/postcss'],
    testingLibraryJestDomVersion: tools['@testing-library/jest-dom'],
    testingLibraryReactVersion: tools['@testing-library/react'],
    testingLibraryUserEventVersion: tools['@testing-library/user-event'],
    postcssVersion: tools.postcss,
    postcssLoaderVersion: tools['postcss-loader'],
    tailwindcssVersion: tools.tailwindcss,
    vitestVersion: tools.vitest,
  };

  mkdirSync(options.targetDir, { recursive: true });
  copyTemplateDir(join(templatesRoot, 'common'), options.targetDir, vars, filesCreated);

  if (options.mode === 'monorepo') {
    copyTemplateDir(join(templatesRoot, 'monorepo'), options.targetDir, vars, filesCreated);
  } else {
    const standaloneVars: Record<string, string> = {
      ...vars,
      authRange: publishedRange(options.repoRoot, 'auth'),
      eventBusRange: publishedRange(options.repoRoot, 'event-bus'),
      sharedTypesRange: publishedRange(options.repoRoot, 'shared-types'),
      uiRange: publishedRange(options.repoRoot, 'ui'),
      typescriptVersion: readRootTypescriptVersion(options.repoRoot),
    };
    copyTemplateDir(
      join(templatesRoot, 'standalone'),
      options.targetDir,
      standaloneVars,
      filesCreated,
    );
  }

  return { filesCreated };
}
