# 0002 — Bundler: Rspack, not Vite

**Status:** Accepted

## Context

Module Federation 2.0's flagship features — Manifest, Federation Runtime,
Runtime Plugin System — have confirmed official support in Webpack and Rspack.
Support for these specific features in Vite (via `@module-federation/vite`) was
not confirmed as complete at research time.

Rspack itself was built by ByteDance specifically because their evaluation of
Vite's esbuild/Rollup pipeline found it incompatible with the Module Federation
setup they needed at scale.

## Decision

Use Rspack as the bundler for all apps (shell, dashboard, admin).

## Evidence considered

Production adoption at scale: ByteDance/TikTok (creator, reports 5-10x build
improvement), Microsoft (internal tooling), Amazon (e-commerce frontend
tooling), Discord (client build system), Mews (cut startup from 3 minutes to
10 seconds). Rspack 1.0 stable since October 2024, ~1.2M downloads/week,
~85-95% Webpack plugin API compatibility. `@module-federation/enhanced` on
Rspack is documented as the fastest migration path to complete MF2 support.

## Consequences

Tailwind CSS is confirmed supported via official Tailwind documentation for
Rspack (PostCSS-based), plus `@rsbuild/plugin-tailwindcss` for optimized
output. No loss of tooling by choosing Rspack over Vite for this project.
