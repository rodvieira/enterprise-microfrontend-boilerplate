import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
// defineConfig lives in @rspack/cli, not @rspack/core — @rspack/core does not
// export it, confirmed against the installed 2.1.7 by inspecting its exports.
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { resolveRegistrySourcePath } from './src/internal/federation/resolve-registry-source';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * "Switching environment is switching a file" (research D3): the build copies
 * exactly one of the three registry files to remotes.json, and that copy —
 * not any compiled-in value — is what the running host fetches at startup.
 *
 * The unknown-environment / missing-file failure (spec edge case) lives in
 * resolveRegistrySourcePath, a pure function, so it is unit-tested directly
 * rather than only provable by running a real rspack build.
 */
const registrySourcePath = resolveRegistrySourcePath(process.env.FEDERATION_ENV, (path) =>
  existsSync(resolve(import.meta.dirname, path)),
);

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
