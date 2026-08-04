import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
// defineConfig lives in @rspack/cli, not @rspack/core — @rspack/core does not
// export it, confirmed against the installed 2.1.7 by inspecting its exports.
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';

const isDev = process.env.NODE_ENV !== 'production';

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
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
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
