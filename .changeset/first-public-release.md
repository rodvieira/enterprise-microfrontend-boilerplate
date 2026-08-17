---
'@enterprise-mfe/shared-types': minor
'@enterprise-mfe/event-bus': minor
'@enterprise-mfe/telemetry': minor
'@enterprise-mfe/auth': minor
'@enterprise-mfe/ui': minor
---

First public release.

These packages have existed at `0.0.0` since the workspace was set up and
were never published, which meant the generator's standalone mode produced
a project whose `pnpm install` could not resolve anything. They now build
to `dist/` (ADR-0020) and publish to the public npm registry, so a
standalone remote installs with no registry configuration and no token.
