---
description: Scaffold a new micro-frontend remote, asking the necessary questions first.
argument-hint: <remote-name>
---

Use the `scaffold-assistant` agent to walk through creating a new remote called
`$ARGUMENTS`. Ask the required questions (domain, auth requirement, monorepo vs
standalone mode, event-bus usage) before running the generator. If the generator
doesn't exist yet (build order not reached that point — check CLAUDE.md), scaffold
manually by copying whichever existing remote (`dashboard` or `admin`) is the
closer structural match, and say so explicitly.
