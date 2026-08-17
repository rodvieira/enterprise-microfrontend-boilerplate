import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
// defineConfig lives in @rspack/cli, not @rspack/core — @rspack/core does not
// export it, confirmed against the installed 2.1.7 by inspecting its exports.
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { buildScriptSrc } from './src/internal/federation/build-csp';
import { resolveRegistrySourcePath } from './src/internal/federation/resolve-registry-source';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * "Switching environment is switching a file": the build copies
 * exactly one of the three registry files to remotes.json, and that copy —
 * not any compiled-in value — is what the running host fetches at startup.
 *
 * The unknown-environment / missing-file failure lives in
 * resolveRegistrySourcePath, a pure function, so it is unit-tested directly
 * rather than only provable by running a real rspack build.
 */
const registrySourcePath = resolveRegistrySourcePath(process.env.FEDERATION_ENV, (path) =>
  existsSync(resolve(import.meta.dirname, path)),
);

/**
 * The CSP's script-src must come from the exact same allowedOrigins this
 * build already selected above — never a second, independently-maintained
 * value. Read straight from the resolved
 * registry file, not re-derived some other way.
 */
const registry = JSON.parse(
  readFileSync(resolve(import.meta.dirname, registrySourcePath), 'utf8'),
) as { allowedOrigins: readonly string[]; basePath?: string };
const contentSecurityPolicy = buildScriptSrc(registry.allowedOrigins);

/**
 * Same "read straight from the resolved registry file" discipline as the
 * CSP above: an environment deployed under a subpath (e.g. a GitHub Pages
 * project page) declares that subpath once, in its own remotes.<env>.json,
 * rather than a second, independently-maintained build flag. Injected as
 * <base href> below, which both the HTML's own asset URLs and the app's
 * runtime registry fetch (manifest.ts) resolve against.
 */
const basePath = registry.basePath ?? '/';

export default defineConfig({
  mode: isDev ? 'development' : 'production',
  entry: { main: './src/index.tsx' },
  output: {
    // Module Federation requires a fully-qualified public path so a remote
    // that later loads this host's shared chunks resolves them correctly.
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic' } },
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        // Exact pattern from Tailwind's own Rspack + React guide:
        // https://tailwindcss.com/docs/installation/framework-guides/rspack/react
        test: /\.css$/,
        use: ['postcss-loader'],
        type: 'css',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './index.html',
      base: { href: basePath },
      // index.html itself stays untouched — HtmlRspackPlugin's own `meta`
      // option injects the tag, rather than adding a second,
      // template-placeholder-based mechanism
      // alongside the CopyRspackPlugin one below.
      //
      // The built-in (native) HtmlRspackPlugin also emits a redundant
      // name="Content-Security-Policy" attribute on this tag (confirmed by
      // inspecting the built dist/index.html — neither 'http-equiv' nor
      // 'httpEquiv' as the nested key avoids it). Harmless: the HTML
      // pragma-processing algorithm applies http-equiv regardless of an
      // unrelated name attribute on the same element, and nothing in this
      // project reads `meta[name="Content-Security-Policy"]`.
      meta: {
        'Content-Security-Policy': {
          'http-equiv': 'Content-Security-Policy',
          content: contentSecurityPolicy,
        },
      },
    }),
    new rspack.CopyRspackPlugin({
      patterns: [{ from: registrySourcePath, to: 'remotes.json' }],
    }),
    new ModuleFederationPlugin({
      name: 'shell',
      // Deliberately no `exposes`: the shell is a host, not a remote. It
      // composes federated regions but exposes nothing of its own — see
      // docs/USAGE.md's "How the pieces fit".
      remotes: {},
      shared: {
        react: { singleton: true, requiredVersion: '^19.2.8' },
        'react-dom': { singleton: true, requiredVersion: '^19.2.8' },
        'react-router': { singleton: true, requiredVersion: '^8.3.0' },
        '@enterprise-mfe/auth': { singleton: true },
        '@enterprise-mfe/telemetry': { singleton: true },
      },
    }),
  ],
  devServer: {
    port: 3000,
    open: false,
    hot: true,
    historyApiFallback: true,
  },
});
