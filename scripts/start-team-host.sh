#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_WORKSPACE="$ROOT_DIR"
REQUIRED_NODE_MAJOR=24

WORKSPACE="$DEFAULT_WORKSPACE"
APPROVAL_MODE="manual"
REMOTE_ACCESS=1
READ_ONLY=0
JSON_OUTPUT=0
DETACH=0

EXTRA_ARGS=()

usage() {
  cat <<'EOF'
Usage:
  scripts/start-team-host.sh [options] [-- <extra teamwork args>]

Defaults:
  --workspace <repo-root>
  --approval manual
  --remote-access enabled

Options:
  --workspace <path>        Workspace directory to host
  --approval <manual|auto>  TeamWork approval mode (default: manual)
  --no-remote-access        Keep host loopback-only (disable sharing)
  --read-only               Start host in read-only mode
  --json                    Print machine-readable orchestrator payload
  --detach                  Start and detach
  --help                    Show this help

Examples:
  scripts/start-team-host.sh
  scripts/start-team-host.sh --workspace /path/to/project --detach
  scripts/start-team-host.sh --json > /tmp/teamwork-session.json
  scripts/start-team-host.sh -- --teamwork-port 8787 --connect-host 10.0.0.2
EOF
}

ensure_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Missing required command: $name" >&2
    exit 1
  fi
}

enable_node24_if_possible() {
  local current_major
  current_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ "$current_major" == "$REQUIRED_NODE_MAJOR" ]]; then
    return 0
  fi

  if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    source "${HOME}/.nvm/nvm.sh"
    if nvm use "$REQUIRED_NODE_MAJOR" >/dev/null 2>&1; then
      return 0
    fi
    if nvm install "$REQUIRED_NODE_MAJOR" >/dev/null 2>&1; then
      nvm use "$REQUIRED_NODE_MAJOR" >/dev/null 2>&1
      return 0
    fi
  fi

  echo "Node.js ${REQUIRED_NODE_MAJOR}.x is required. Current: $(node -v)." >&2
  echo "Install/switch Node ${REQUIRED_NODE_MAJOR} (for example with nvm), then rerun." >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --workspace" >&2
        exit 1
      fi
      WORKSPACE="$2"
      shift 2
      ;;
    --approval)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --approval" >&2
        exit 1
      fi
      APPROVAL_MODE="$2"
      shift 2
      ;;
    --no-remote-access)
      REMOTE_ACCESS=0
      shift
      ;;
    --read-only)
      READ_ONLY=1
      shift
      ;;
    --json)
      JSON_OUTPUT=1
      shift
      ;;
    --detach)
      DETACH=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      EXTRA_ARGS+=("$@")
      break
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

case "$APPROVAL_MODE" in
  manual|auto) ;;
  *)
    echo "Invalid --approval value: $APPROVAL_MODE (expected manual|auto)" >&2
    exit 1
    ;;
esac

ensure_command node
ensure_command pnpm
ensure_command bun
ensure_command opencode

enable_node24_if_possible

if [[ ! -d "$WORKSPACE" ]]; then
  echo "Workspace does not exist: $WORKSPACE" >&2
  exit 1
fi

CMD=(
  pnpm
  --filter
  teamwork-orchestrator
  dev
  --
  start
  --workspace
  "$WORKSPACE"
  --approval
  "$APPROVAL_MODE"
)

if [[ "$REMOTE_ACCESS" -eq 1 ]]; then
  CMD+=(--remote-access)
fi

if [[ "$READ_ONLY" -eq 1 ]]; then
  CMD+=(--read-only)
fi

if [[ "$JSON_OUTPUT" -eq 1 ]]; then
  CMD+=(--json)
fi

if [[ "$DETACH" -eq 1 ]]; then
  CMD+=(--detach)
fi

if [[ ${#EXTRA_ARGS[@]} -gt 0 ]]; then
  CMD+=("${EXTRA_ARGS[@]}")
fi

cd "$ROOT_DIR"
exec "${CMD[@]}"
