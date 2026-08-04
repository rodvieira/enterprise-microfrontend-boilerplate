import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
// defineConfig lives in @rspack/cli, not @rspack/core — @rspack/core does not
// export it, confirmed against the installed 2.1.7 by inspecting its exports.
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * FR-005: starting the host requires no configuration — FEDERATION_ENV
 * defaults to 'dev' when unset, matching the variable already documented in
 * the repository root's .env.example.
 *
 * This is what makes "switching environment is switching a file" literal
 * (research D3): the build copies exactly one of the three registry files to
 * remotes.json, and that copy — not any compiled-in value — is what the
 * running host fetches at startup.
 */
const FEDERATION_ENV = process.env.FEDERATION_ENV ?? 'dev';
const KNOWN_ENVIRONMENTS = ['dev', 'staging', 'production'];
const registrySourceFile = `remotes.${FEDERATION_ENV}.json`;
const registrySourcePath = `./src/internal/federation/${registrySourceFile}`;

if (!KNOWN_ENVIRONMENTS.includes(FEDERATION_ENV)) {
  // Spec edge case: an unknown environment selector must refuse to start with
  // a message naming both the environment and the file it expected, never
  // fall back to a default silently.
  throw new Error(
    `apps/shell: FEDERATION_ENV="${FEDERATION_ENV}" is not one of ${KNOWN_ENVIRONMENTS.join(', ')}. ` +
      `Expected a registry file at ${registrySourcePath}.`,
  );
}
if (!existsSync(resolve(import.meta.dirname, registrySourcePath))) {
  throw new Error(
    `apps/shell: no registry file for environment "${FEDERATION_ENV}" — expected ${registrySourcePath} to exist.`,
  );
}

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
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
    new rspack.CopyRspackPlugin({
      patterns: [{ from: registrySourcePath, to: 'remotes.json' }],
    }),
    new ModuleFederationPlugin({
      name: 'shell',
      // Deliberately no `exposes`: the shell is a host, not a remote. It
      // composes federated regions but exposes nothing of its own — see
      // constitution Principle I and research D8.
      remotes: {},
      shared: {
        react: { singleton: true, requiredVersion: '^19.2.8' },
        'react-dom': { singleton: true, requiredVersion: '^19.2.8' },
        'react-router': { singleton: true, requiredVersion: '^8.3.0' },
        '@enterprise-mfe/auth': { singleton: true },
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
