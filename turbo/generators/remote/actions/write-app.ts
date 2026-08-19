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
 * already ran during prompt collection — this function only
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
    // Where src/exposed/App.tsx gets RemoteAppProps from. Inside this
    // workspace that is the shared-types package. A standalone project has no
    // registry to install that package from, so it carries its own copy of
    // the contract (templates/standalone/src/internal/contract.ts) instead —
    // and this has to be decided here, before templates/common is rendered,
    // because App.tsx lives there and is rendered exactly once.
    contractImport:
      options.mode === 'monorepo' ? '@enterprise-mfe/shared-types' : '../internal/contract',
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
