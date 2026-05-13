# TeamWork Team Setup And Sharing Guide

This guide shows how to run this fork so one person can host a shared TeamWork workspace and teammates can connect remotely.

## 1. Decide Roles

Use these roles for predictable operations:

1. Host operator: runs the shared TeamWork runtime for a workspace.
2. Collaborators: connect to the host runtime from TeamWork clients.
3. Admin approver: uses host token to approve/deny risky actions (can be same person as host operator).

## 2. Prepare The Host Machine

From this repository root:

```bash
cd /home/samir/projects/AI-Brain/BrainWork/teamwork
pnpm install
```

Required tooling for source-based team setup:

1. Node.js 24.x
2. pnpm 10.27.x
3. Bun 1.3.9+
4. OpenCode CLI available on PATH

Optional but useful:

1. TeamWork desktop app for local testing on host.

## 3. Start A Shared Host Runtime

Recommended (one command):

```bash
cd /home/samir/projects/AI-Brain/BrainWork/teamwork
scripts/start-team-host.sh
```

The helper script defaults to:

1. `--workspace` = repo root
2. `--approval manual`
3. `--remote-access` enabled

Equivalent raw orchestrator command:

```bash
cd /home/samir/projects/AI-Brain/BrainWork/teamwork
pnpm --filter teamwork-orchestrator dev -- \
  start \
  --workspace /home/samir/projects/AI-Brain/BrainWork/teamwork \
  --remote-access \
  --approval manual
```

What this does:

1. Runs OpenCode + TeamWork server + OpenCode router for the workspace.
2. Binds TeamWork for remote sharing (`--remote-access`).
3. Keeps writes gated by explicit approvals (`--approval manual`).

Useful helper-script variants:

```bash
# Different workspace
scripts/start-team-host.sh --workspace /path/to/project

# Capture credentials JSON
scripts/start-team-host.sh --json > /tmp/teamwork-session.json

# Start read-only host for demo/review
scripts/start-team-host.sh --read-only

# Pass extra teamwork args
scripts/start-team-host.sh -- --teamwork-port 8787 --connect-host 10.0.0.2
```

## 4. Collect Connect Credentials Securely

For automation/onboarding scripts, start with JSON output and capture secrets to a protected file:

```bash
cd /home/samir/projects/AI-Brain/BrainWork/teamwork
scripts/start-team-host.sh --json > /tmp/teamwork-session.json
```

Extract fields:

```bash
jq -r '.teamwork.connectUrl' /tmp/teamwork-session.json
jq -r '.teamwork.collaboratorToken' /tmp/teamwork-session.json
jq -r '.teamwork.ownerToken' /tmp/teamwork-session.json
jq -r '.teamwork.hostToken' /tmp/teamwork-session.json
```

Share only these with collaborators:

1. `teamwork.connectUrl`
2. `teamwork.collaboratorToken`

Keep private to admins only:

1. `teamwork.ownerToken`
2. `teamwork.hostToken`

## 5. Collaborator Connection Steps

Each teammate does:

1. Open TeamWork desktop app.
2. Go to `Add worker` -> `Connect remote`.
3. Paste host `connectUrl`.
4. Paste `collaboratorToken`.
5. Connect.

## 6. Approval Workflow (Manual Mode)

When collaborators request write actions, approver can review and decide:

```bash
teamwork approvals list \
  --teamwork-url http://<host>:<teamwork-port> \
  --host-token <host-token>

teamwork approvals reply <approval-id> --allow \
  --teamwork-url http://<host>:<teamwork-port> \
  --host-token <host-token>

teamwork approvals reply <approval-id> --deny \
  --teamwork-url http://<host>:<teamwork-port> \
  --host-token <host-token>
```

If global `teamwork` is not installed, run through the repo:

```bash
pnpm --filter teamwork-orchestrator dev -- approvals list \
  --teamwork-url http://<host>:<teamwork-port> \
  --host-token <host-token>
```

## 7. Health Checks

Quick service checks:

```bash
teamwork status \
  --teamwork-url http://<host>:<teamwork-port> \
  --opencode-url http://<host>:<opencode-port>
```

If you are running from source without global `teamwork` install, run via:

```bash
pnpm --filter teamwork-orchestrator dev -- status \
  --teamwork-url http://<host>:<teamwork-port> \
  --opencode-url http://<host>:<opencode-port>
```

## 8. Security Baseline For Team Sharing

Use these defaults unless you have a stronger platform policy:

1. Keep `--approval manual` for shared hosts.
2. Never post tokens in chat/email/plain docs.
3. Prefer private network access (VPN/Tailscale) over direct public exposure.
4. Rotate all tokens by restarting orchestrator when someone leaves the project.
5. Use `--read-only` when running demo/review sessions.

Read-only start example:

```bash
pnpm --filter teamwork-orchestrator dev -- \
  start \
  --workspace /home/samir/projects/AI-Brain/BrainWork/teamwork \
  --remote-access \
  --read-only
```

## 9. Team Operating Model (Recommended)

1. One staging host for daily collaboration.
2. One production-like host for demos/customer workflows.
3. Same branch and workspace conventions across both hosts.
4. Approval ownership assigned per host rotation.

## 10. Onboarding Checklist (Copy/Paste)

1. Tooling installed (`node`, `pnpm`, `bun`, `opencode`).
2. Host started with `--remote-access --approval manual`.
3. Collaborator receives `connectUrl` + `collaboratorToken`.
4. Admin stores `ownerToken` + `hostToken` in a secret manager.
5. Approval test performed (`list` then `allow`/`deny`).
6. Health check command verified.

## 11. Troubleshooting

1. Desktop dev crashes with `module.exports`/ESM errors: ensure Node is 24.x.
2. Electron starts as plain Node: unset `ELECTRON_RUN_AS_NODE`.
3. Teammates cannot connect: verify firewall/NAT allows host TeamWork port.
4. Approval actions fail: confirm you are using `hostToken` (not collaborator token).
