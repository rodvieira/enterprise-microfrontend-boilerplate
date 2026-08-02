# enterprise-microfrontend-boilerplate

> 🚧 **Under active development.** This README will be replaced with the full
> version (demo GIF, live links, usage docs) at launch — see
> [`docs/blueprint.html`](docs/blueprint.html) for the complete technical spec
> and [`docs/decisions/`](docs/decisions/) for every architectural decision
> made so far, with the reasoning behind each one.

A production-grade starting point for large, scalable React applications built
on micro-frontend architecture (Module Federation 2.0, via Rspack). Ships two
working example micro-frontends — a dashboard and an admin panel — composed
inside a shell, sharing a design system and an authentication contract,
communicating through a typed event bus.

## Current status

Following the build order in `docs/blueprint.html` §15. Check
[`docs/decisions/`](docs/decisions/) for what's been decided and why.

## Quick start (once sprint 1 lands)

```bash
pnpm install
pnpm dev
```

## License

MIT — see [LICENSE](LICENSE).
