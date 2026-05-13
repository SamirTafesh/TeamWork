---
name: teamwork-orchestrator-npm-publish
description: |
  Publish the teamwork-orchestrator npm package with clean git hygiene.

  Triggers when user mentions:
  - "teamwork-orchestrator npm publish"
  - "publish teamwork-orchestrator"
  - "bump teamwork-orchestrator"
---

## Quick usage (already configured)

1. Ensure you are on the default branch and the tree is clean.
2. Bump versions via the shared release bump (this keeps `teamwork-orchestrator` aligned with the app/desktop release).

```bash
pnpm bump:patch
# or: pnpm bump:minor
# or: pnpm bump:major
# or: pnpm bump:set -- X.Y.Z
```

3. Commit the bump.
4. Preferred: publish via the "Release App" GitHub Actions workflow by tagging `vX.Y.Z`.

Manual recovery path (sidecars + npm) below.

```bash
pnpm --filter teamwork-orchestrator build:sidecars
gh release create teamwork-orchestrator-vX.Y.Z packages/orchestrator/dist/sidecars/* \
  --repo SamirTafesh/TeamWork \
  --title "teamwork-orchestrator vX.Y.Z sidecars" \
  --notes "Sidecar binaries and manifest for teamwork-orchestrator vX.Y.Z"
```

5. Build teamwork-orchestrator binaries for all supported platforms.

```bash
pnpm --filter teamwork-orchestrator build:bin:all
```

6. Publish `teamwork-orchestrator` as a meta package + platform packages (optionalDependencies).

```bash
node packages/orchestrator/scripts/publish-npm.mjs
```

7. Verify the published version.

```bash
npm view teamwork-orchestrator version
```

---

## Scripted publish

```bash
./.opencode/skills/teamwork-orchestrator-npm-publish/scripts/publish-teamwork-orchestrator.sh
```

---

## First-time setup (if not configured)

Authenticate with npm before publishing.

```bash
npm login
```

Alternatively, export an npm token in your environment (see `.env.example`).

---

## Notes

- `teamwork-orchestrator` is published as:
  - `teamwork-orchestrator` (wrapper + optionalDependencies)
  - `teamwork-orchestrator-darwin-arm64`, `teamwork-orchestrator-darwin-x64`, `teamwork-orchestrator-linux-arm64`, `teamwork-orchestrator-linux-x64`, `teamwork-orchestrator-windows-x64` (platform binaries)
- `teamwork-orchestrator` is versioned in lockstep with TeamWork app/desktop releases.
- teamwork-orchestrator downloads sidecars from `teamwork-orchestrator-vX.Y.Z` release assets by default.
