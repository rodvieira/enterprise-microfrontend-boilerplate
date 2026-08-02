# 0003 — Federation layer: Module Federation 2.0

**Status:** Accepted

## Context

Three real alternatives exist for micro-frontend composition: Module
Federation (webpack-ecosystem), single-spa (SystemJS/import-map based), and
Qiankun (popular primarily in the Chinese enterprise ecosystem).

## Decision

Use Module Federation 2.0.

## Rationale

- Dynamic TypeScript type sharing across remotes — neither single-spa nor
  Qiankun offer this natively.
- Manifest-based dynamic host discovery, which underpins this project's
  per-environment remote registry (see `docs/architecture.md`).
- Broader international adoption and documentation than Qiankun.
- More current architecture than single-spa, which predates Module Federation
  and requires a framework-less root config by convention — a constraint this
  project does not want to inherit.

## Consequences

Module Federation itself prescribes no folder structure — the `exposed/` /
`internal/` convention and the manifest system in this repo are our own design
on top of it, not a requirement of the technology. See ADR-0006.
