---
description: Run the TeamWork release flow
---

You are running the TeamWork release flow in this repo.

Arguments: `$ARGUMENTS`
- If empty, default to a patch release.
- If set to `minor` or `major`, use that bump type.

Do the following, in order, and stop on any failure:

1. Sync `dev` and ensure the working tree is clean.
2. Bump app/desktop versions using `pnpm bump:$ARGUMENTS` (or `pnpm bump:patch` if empty).
3. If any dependencies were pinned or changed, run `pnpm install --lockfile-only`.
4. Run `pnpm release:review` and resolve any mismatches.
5. Tag and push: `git tag vX.Y.Z` and `git push origin vX.Y.Z`, then `git push origin dev`.
6. Watch the Release App GitHub Actions workflow to completion.
7. If releasing teamwork-orchestrator sidecars, build deterministically with `SOURCE_DATE_EPOCH`, upload assets to `teamwork-orchestrator-vX.Y.Z`, and publish `teamwork-orchestrator`.
8. If `teamwork-server` or `opencode-router` versions changed, publish those packages.

Report what you changed, the tag created, and the GHA status.
