#!/usr/bin/env sh
set -eu

TEAMWORK_WORKSPACE="${TEAMWORK_WORKSPACE:-/workspace}"
TEAMWORK_DATA_DIR="${TEAMWORK_DATA_DIR:-/data/teamwork-orchestrator}"
TEAMWORK_SIDECAR_DIR="${TEAMWORK_SIDECAR_DIR:-/data/sidecars}"
TEAMWORK_PORT="${TEAMWORK_PORT:-8787}"
TEAMWORK_OPENCODE_PORT="${TEAMWORK_OPENCODE_PORT:-4096}"
TEAMWORK_TOKEN="${TEAMWORK_TOKEN:-microsandbox-token}"
TEAMWORK_HOST_TOKEN="${TEAMWORK_HOST_TOKEN:-microsandbox-host-token}"
TEAMWORK_APPROVAL_MODE="${TEAMWORK_APPROVAL_MODE:-auto}"
TEAMWORK_CORS_ORIGINS="${TEAMWORK_CORS_ORIGINS:-*}"
TEAMWORK_CONNECT_HOST="${TEAMWORK_CONNECT_HOST:-127.0.0.1}"
HOME="${HOME:-/root}"
USER="${USER:-root}"
SHELL="${SHELL:-/bin/sh}"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"

if [ "$HOME" = "/" ]; then
  HOME=/root
  XDG_CONFIG_HOME="$HOME/.config"
  XDG_CACHE_HOME="$HOME/.cache"
  XDG_DATA_HOME="$HOME/.local/share"
  XDG_STATE_HOME="$HOME/.local/state"
fi

export HOME USER SHELL XDG_CONFIG_HOME XDG_CACHE_HOME XDG_DATA_HOME XDG_STATE_HOME

mkdir -p "$TEAMWORK_WORKSPACE" "$TEAMWORK_DATA_DIR" "$TEAMWORK_SIDECAR_DIR"
mkdir -p "$HOME" "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$XDG_DATA_HOME" "$XDG_STATE_HOME"

printf '%s\n' "Starting TeamWork micro-sandbox"
printf '%s\n' "- workspace: $TEAMWORK_WORKSPACE"
printf '%s\n' "- home: $HOME"
printf '%s\n' "- teamwork url: http://$TEAMWORK_CONNECT_HOST:$TEAMWORK_PORT"
printf '%s\n' "- client token: $TEAMWORK_TOKEN"
printf '%s\n' "- host token: $TEAMWORK_HOST_TOKEN"
printf '%s\n' "- health: curl http://$TEAMWORK_CONNECT_HOST:$TEAMWORK_PORT/health"
printf '%s\n' "- auth test: curl -H \"Authorization: Bearer $TEAMWORK_TOKEN\" http://$TEAMWORK_CONNECT_HOST:$TEAMWORK_PORT/workspaces"

exec teamwork serve \
  --workspace "$TEAMWORK_WORKSPACE" \
  --remote-access \
  --teamwork-port "$TEAMWORK_PORT" \
  --opencode-host 127.0.0.1 \
  --opencode-port "$TEAMWORK_OPENCODE_PORT" \
  --teamwork-token "$TEAMWORK_TOKEN" \
  --teamwork-host-token "$TEAMWORK_HOST_TOKEN" \
  --approval "$TEAMWORK_APPROVAL_MODE" \
  --cors "$TEAMWORK_CORS_ORIGINS" \
  --connect-host "$TEAMWORK_CONNECT_HOST" \
  --allow-external \
  --sidecar-source external \
  --opencode-source external \
  --teamwork-server-bin /usr/local/bin/teamwork-server \
  --opencode-bin /usr/local/bin/opencode \
  --no-opencode-router
