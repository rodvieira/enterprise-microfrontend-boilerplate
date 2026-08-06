import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  mode: isDev ? 'development' : 'production',
  entry: { main: './src/index.tsx' },
  output: {
    // Module Federation requires a fully-qualified public path so the shell
    // resolves this remote's exposed modules and shared chunks correctly.
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
        // Same pattern as apps/shell/rspack.config.ts (research D2 in
        // 002-shell-host): https://tailwindcss.com/docs/installation/framework-guides/rspack/react
        test: /\.css$/,
        use: ['postcss-loader'],
        type: 'css',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
    new ModuleFederationPlugin({
      name: 'dashboard',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/exposed/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.2.8' },
        'react-dom': { singleton: true, requiredVersion: '^19.2.8' },
        'react-router': { singleton: true, requiredVersion: '^8.3.0' },
        '@enterprise-mfe/auth': { singleton: true },
        '@enterprise-mfe/event-bus': { singleton: true },
      },
    }),
  ],
  devServer: {
    port: 3001,
    open: false,
    hot: true,
    historyApiFallback: true,
    // Module Federation loads this remote's manifest and remoteEntry.js
    // cross-origin from the shell (port 3000). Without this, the browser's
    // CORS policy blocks the fetch outright — found by actually running the
    // composed shell + dashboard in a real browser (Playwright), not by
    // inspecting the config.
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
});
