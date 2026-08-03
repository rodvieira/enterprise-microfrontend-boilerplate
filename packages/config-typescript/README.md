# @enterprise-mfe/config-typescript

The TypeScript settings every package and app in this repository inherits, so
strictness is defined once instead of being pasted into a dozen `tsconfig.json`
files that quietly diverge over the life of the project. Extending this is the
only supported way to configure the compiler for a workspace member — if you find
yourself copying a compiler option out of here into a package, that is the signal
the option belongs here instead.

## Usage

```jsonc
// packages/<name>/tsconfig.json
{
  "extends": "@enterprise-mfe/config-typescript/tsconfig.base.json",
  "include": ["src/**/*", "tests/**/*"]
}
```

Use `tsconfig.react.json` instead for anything that renders — it adds the DOM
libraries and the JSX transform.

## What it turns on

`strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitOverride`, and `noFallthroughCasesInSwitch`. Module resolution is
`bundler` with `verbatimModuleSyntax`, matching how Rspack will consume these
packages.

`noEmit` is on: packages ship TypeScript source and the consuming application
compiles it, so nothing here produces output.

## A note on direct use

`tsconfig.base.json` is meant to be extended, never pointed at directly — a
config with no input files is an error to the compiler (TS18003). The root
`tsconfig.json` extends it and supplies the file list; that is what
`dependency-cruiser` uses to resolve the workspace.
