# TeamWork Orchestrator

Host orchestrator for opencode + TeamWork server + opencode-router. This is a CLI-first way to run host mode without the desktop UI.

Published on npm as `teamwork-orchestrator` and installs the `teamwork` command.

## Quick start

```bash
npm install -g teamwork-orchestrator
teamwork start --workspace /path/to/workspace --approval auto
```

When run in a TTY, `teamwork` shows an interactive status dashboard with service health, ports, and
connection details. Use `teamwork serve` or `--no-tui` for log-only mode.

```bash
teamwork serve --workspace /path/to/workspace
```

`teamwork` ships as a compiled binary, so Bun is not required at runtime.

If npm skips the optional platform package, `postinstall` falls back to downloading the matching
binary from the `teamwork-orchestrator-v<version>` GitHub release. Override the download host with
`TEAMWORK_ORCHESTRATOR_DOWNLOAD_BASE_URL` when you need to use a mirror.

`teamwork` downloads and caches the `teamwork-server`, `opencode-router`, and `opencode` sidecars on
first run using a SHA-256 manifest. Use `--sidecar-dir` or `TEAMWORK_SIDECAR_DIR` to control the
cache location, and `--sidecar-base-url` / `--sidecar-manifest` to point at a custom host.

Use `--sidecar-source` to control where `teamwork-server` and `opencode-router` are resolved
(`auto` | `bundled` | `downloaded` | `external`), and `--opencode-source` to control
`opencode` resolution. Set `TEAMWORK_SIDECAR_SOURCE` / `TEAMWORK_OPENCODE_SOURCE` to
apply the same policies via env vars.

By default the manifest is fetched from
`https://github.com/SamirTafesh/TeamWork/releases/download/teamwork-orchestrator-v<version>/teamwork-orchestrator-sidecars.json`.

OpenCode Router is optional. If it exits, `teamwork` continues running unless you pass
`--opencode-router-required` or set `TEAMWORK_OPENCODE_ROUTER_REQUIRED=1`.

For development overrides only, set `TEAMWORK_ALLOW_EXTERNAL=1` or pass `--allow-external` to use
locally installed `teamwork-server` or `opencode-router` binaries.

Add `--verbose` (or `TEAMWORK_VERBOSE=1`) to print extra diagnostics about resolved binaries.

OpenCode hot reload is enabled by default when launched via `teamwork`.
Tune it with:

- `--opencode-hot-reload` / `--no-opencode-hot-reload`
- `--opencode-hot-reload-debounce-ms <ms>`
- `--opencode-hot-reload-cooldown-ms <ms>`

Equivalent env vars:

- `TEAMWORK_OPENCODE_HOT_RELOAD` (router mode)
- `TEAMWORK_OPENCODE_HOT_RELOAD_DEBOUNCE_MS`
- `TEAMWORK_OPENCODE_HOT_RELOAD_COOLDOWN_MS`
- `TEAMWORK_OPENCODE_HOT_RELOAD` (start/serve mode)
- `TEAMWORK_OPENCODE_HOT_RELOAD_DEBOUNCE_MS`
- `TEAMWORK_OPENCODE_HOT_RELOAD_COOLDOWN_MS`

Or from source:

```bash
pnpm --filter teamwork-orchestrator dev -- \
  start --workspace /path/to/workspace --approval auto --allow-external
```

When `TEAMWORK_DEV_MODE=1` is set, orchestrator uses an isolated OpenCode dev state for config, auth, data, cache, and state. TeamWork's repo-level `pnpm dev` commands enable this automatically so local development does not reuse your personal OpenCode environment.

The command prints pairing URLs by default and withholds live credentials from stdout to avoid leaking them into shell history or collected logs. Use `--json` only when you explicitly need the raw pairing secrets in command output.

Use `--detach` to keep services running and exit the dashboard. The detach summary includes the
TeamWork URL and a redacted `opencode attach` command, while keeping live credentials out of the detached summary.

## Sandbox mode (Docker / Apple container)

`teamwork` can run the sidecars inside a Linux container boundary while still mounting your workspace
from the host.

```bash
# Auto-pick sandbox backend (prefers Apple container on supported Macs)
teamwork start --sandbox auto --workspace /path/to/workspace --approval auto

# Explicit backends
teamwork start --sandbox docker --workspace /path/to/workspace --approval auto
teamwork start --sandbox container --workspace /path/to/workspace --approval auto
```

Notes:

- `--sandbox auto` prefers Apple `container` on supported Macs (arm64), otherwise Docker.
- Docker backend requires `docker` on your PATH.
- Apple container backend requires the `container` CLI (https://github.com/apple/container).
- In sandbox mode, sidecars are resolved for a Linux target (and `--sidecar-source` / `--opencode-source`
  are effectively `downloaded`).
- Custom `--*-bin` overrides are not supported in sandbox mode yet.
- Use `--sandbox-image` to pick an image with the toolchain you want available to OpenCode.
- Use `--sandbox-persist-dir` to control the host directory mounted at `/persist` inside the container.

### Extra mounts (allowlisted)

You can add explicit, validated mounts into `/workspace/extra/*`:

```bash
teamwork start --sandbox auto --sandbox-mount "/path/on/host:datasets:ro" --workspace /path/to/workspace
```

Additional mounts are blocked unless you create an allowlist at:

- `~/.config/teamwork/sandbox-mount-allowlist.json`

Override with `TEAMWORK_SANDBOX_MOUNT_ALLOWLIST`.

## Logging

`teamwork` emits a unified log stream from OpenCode, TeamWork server, and opencode-router. Use JSON format for
structured, OpenTelemetry-friendly logs and a stable run id for correlation.

```bash
TEAMWORK_LOG_FORMAT=json teamwork start --workspace /path/to/workspace
```

Use `--run-id` or `TEAMWORK_RUN_ID` to supply your own correlation id.

OpenCode runs at `INFO` by default, which produces large log files in
`~/.local/share/opencode/log/`. Pass `--opencode-log-level <DEBUG|INFO|WARN|ERROR>` (or set
`TEAMWORK_OPENCODE_LOG_LEVEL`) to forward `--log-level` to managed `opencode serve` and reduce log
volume.

TeamWork server logs every request with method, path, status, and duration. Disable this when running
`teamwork-server` directly by setting `TEAMWORK_LOG_REQUESTS=0` or passing `--no-log-requests`.

## Router daemon (multi-workspace)

The router keeps a single OpenCode process alive and switches workspaces JIT using the `directory` parameter.

```bash
teamwork daemon start
teamwork workspace add /path/to/workspace-a
teamwork workspace add /path/to/workspace-b
teamwork workspace list --json
teamwork workspace path <id>
teamwork instance dispose <id>
```

Use `TEAMWORK_DATA_DIR` or `--data-dir` to isolate router state in tests.

## Pairing notes

- Use the **TeamWork connect URL** and **client token** to connect a remote TeamWork client.
- The TeamWork server advertises the **OpenCode connect URL** plus optional basic auth credentials to the client.

## Approvals (manual mode)

```bash
teamwork approvals list \
  --teamwork-url http://<host>:8787 \
  --host-token <token>

teamwork approvals reply <id> --allow \
  --teamwork-url http://<host>:8787 \
  --host-token <token>
```

## Health checks

```bash
teamwork status \
  --teamwork-url http://<host>:8787 \
  --opencode-url http://<host>:4096
```

## File sessions (JIT catalog + batch read/write)

Create a short-lived workspace file session and sync files in batches:

```bash
# Create writable session
teamwork files session create \
  --teamwork-url http://<host>:8787 \
  --token <client-token> \
  --workspace-id <workspace-id> \
  --write \
  --json

# Fetch catalog snapshot
teamwork files catalog <session-id> \
  --teamwork-url http://<host>:8787 \
  --token <client-token> \
  --limit 200 \
  --json

# Read one or more files
teamwork files read <session-id> \
  --teamwork-url http://<host>:8787 \
  --token <client-token> \
  --paths "README.md,notes/todo.md" \
  --json

# Write a file (inline content or --file)
teamwork files write <session-id> \
  --teamwork-url http://<host>:8787 \
  --token <client-token> \
  --path notes/todo.md \
  --content "hello from teamwork" \
  --json

# Watch change events and close session
teamwork files events <session-id> --teamwork-url http://<host>:8787 --token <client-token> --since 0 --json
teamwork files session close <session-id> --teamwork-url http://<host>:8787 --token <client-token> --json
```

## Smoke checks

```bash
teamwork start --workspace /path/to/workspace --check --check-events
```

This starts the services, verifies health + SSE events, then exits cleanly.

## Local development

Point to source CLIs for fast iteration:

```bash
teamwork start \
  --workspace /path/to/workspace \
  --allow-external \
  --teamwork-server-bin apps/server/src/cli.ts \
  --opencode-router-bin apps/opencode-router/dist/cli.js
```
