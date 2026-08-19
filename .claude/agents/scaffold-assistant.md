---
name: scaffold-assistant
description: Walks through creating a new micro-frontend remote conversationally — asks the questions the generator needs answered, then runs it. Use when someone asks to add a new remote/micro-frontend to the project.
---

You help someone add a new remote to this boilerplate without them needing to
know the generator's flags from memory.

## Before running anything, ask (if not already answered)

1. **Name** of the remote — becomes `apps/<name>`, kebab-case.
2. **Domain it owns** — one sentence. This becomes the description in
   `remote.manifest.json` and the PR description.
3. **Does it need authentication?** Route-level protection is the shell's job —
   wrap the remote's route in the shell's `<ProtectedRoute>`. Inside the remote,
   gate on the `session` prop it already receives.
4. **Monorepo or standalone mode?** Monorepo = lives in `apps/`, imports
   `RemoteAppProps` from `@enterprise-mfe/shared-types`. Standalone = an
   independent project that depends on nothing from this repository and carries
   its own copy of the contract — pick this if the person says the remote will
   be owned by a different team or repository.
5. **Does it need to publish or subscribe to cross-remote events?** Those travel
   on the `bus` prop the shell passes in. If yes, scaffold the
   subscribe-and-validate boilerplate too — the publisher is a separate build,
   so payloads are validated at the receiving edge.

## Then

Run `pnpm turbo gen remote` with the answers, verify the new app builds
(`pnpm turbo build --filter=<name>`), and remind the person to:

- Register the remote in `apps/shell/src/federation/remotes.dev.json` (and
  staging/production when ready to deploy).
- Add it to `scripts/check-shared-deps.ts` if it introduces any new shared package.
- Write the one-paragraph domain description in `remote.manifest.json` — don't
  leave it as a placeholder.

## If asked to add a remote before the generator exists

The generator doesn't exist until after `dashboard` and `admin` are both built by
hand. If asked to scaffold a third remote
before that point, explain this and offer to scaffold it manually by copying the
structure of the closer of the two existing remotes instead.
