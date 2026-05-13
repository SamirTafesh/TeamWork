# TeamWork Local Server Deployment Guide (LAN Team Host)

This guide deploys TeamWork on a local Ubuntu/Linux server so your whole team can connect to one shared host.

It covers:

1. Running TeamWork in shared mode on LAN
2. Keeping it always-on with `systemd`
3. Optional `nginx` reverse proxy
4. Team onboarding and token management

## 1. Deployment Model

Recommended for local office/home lab:

1. One Linux server hosts TeamWork.
2. TeamWork listens on LAN (`0.0.0.0:8787`).
3. Teammates connect using:
   - `connectUrl` (for example `http://10.0.0.20:8787`)
   - collaborator token
4. Keep approvals in `manual` mode.

## 2. Prerequisites (Host Server)

Install these on the host:

1. Node.js `24.x`
2. `pnpm` `10.x`
3. `bun` `1.3.9+`
4. `opencode` CLI available on PATH
5. `git`, `jq`, `openssl`

Repo path used below:

```bash
/opt/teamwork/teamwork
```

Workspace path used below:

```bash
/srv/teamwork/workspaces/main
```

## 3. Clone And Install

```bash
sudo mkdir -p /opt/teamwork
sudo chown -R "$USER":"$USER" /opt/teamwork
cd /opt/teamwork
git clone git@github.com:SamirTafesh/teamwork.git
cd teamwork
pnpm install
```

Create workspace folder:

```bash
sudo mkdir -p /srv/teamwork/workspaces/main
sudo chown -R "$USER":"$USER" /srv/teamwork/workspaces/main
```

## 4. Generate Stable Tokens

```bash
COLLAB_TOKEN="$(openssl rand -hex 32)"
HOST_TOKEN="$(openssl rand -hex 32)"
echo "$COLLAB_TOKEN"
echo "$HOST_TOKEN"
```

Store these in a protected file:

```bash
sudo mkdir -p /etc/teamwork
sudo tee /etc/teamwork/teamwork.env >/dev/null <<EOF
WORKSPACE_DIR=/srv/teamwork/workspaces/main
TEAMWORK_PORT=8787
TEAMWORK_CONNECT_HOST=10.0.0.20
TEAMWORK_TOKEN=${COLLAB_TOKEN}
TEAMWORK_HOST_TOKEN=${HOST_TOKEN}
EOF
sudo chmod 600 /etc/teamwork/teamwork.env
```

Set `TEAMWORK_CONNECT_HOST` to your server LAN IP or internal DNS name.

## 5. First Manual Start (Validation)

```bash
cd /opt/teamwork/teamwork
set -a
source /etc/teamwork/teamwork.env
set +a

pnpm --filter teamwork-orchestrator dev -- \
  serve \
  --workspace "$WORKSPACE_DIR" \
  --remote-access \
  --teamwork-host 0.0.0.0 \
  --teamwork-port "$TEAMWORK_PORT" \
  --connect-host "$TEAMWORK_CONNECT_HOST" \
  --teamwork-token "$TEAMWORK_TOKEN" \
  --teamwork-host-token "$TEAMWORK_HOST_TOKEN" \
  --approval manual
```

Health check from host:

```bash
curl -fsS "http://127.0.0.1:${TEAMWORK_PORT}/health"
```

Stop with `Ctrl+C` after validation.

## 6. Run As A Systemd Service (Always On)

Copy the example unit:

```bash
sudo cp deployment/local/teamwork-team.service.example /etc/systemd/system/teamwork-team.service
```

Edit `/etc/systemd/system/teamwork-team.service`:

1. Set `User=` and `Group=` to your Linux account (or dedicated service account).
2. Confirm `WorkingDirectory=/opt/teamwork/teamwork`.

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now teamwork-team.service
sudo systemctl status teamwork-team.service --no-pager
```

Follow logs:

```bash
journalctl -u teamwork-team.service -f
```

## 7. Optional Nginx Reverse Proxy

Use nginx if you want a stable internal hostname and/or TLS termination.

Example config:

```bash
sudo cp deployment/local/nginx-teamwork-lan.conf.example /etc/nginx/sites-available/teamwork-lan.conf
sudo ln -sfn /etc/nginx/sites-available/teamwork-lan.conf /etc/nginx/sites-enabled/teamwork-lan.conf
sudo nginx -t
sudo systemctl restart nginx
```

If you proxy through nginx, set:

1. `TEAMWORK_CONNECT_HOST` to the nginx hostname
2. `TEAMWORK_PORT` to nginx listen port (for example `443` or `80`)

Then restart service:

```bash
sudo systemctl restart teamwork-team.service
```

## 8. Team Onboarding

Share with teammates:

1. `connectUrl`: `http://<TEAMWORK_CONNECT_HOST>:<TEAMWORK_PORT>`
2. collaborator token: value of `TEAMWORK_TOKEN`

Do not share:

1. `TEAMWORK_HOST_TOKEN` (admin approvals token)

Client steps:

1. Open TeamWork desktop app.
2. `Add worker` -> `Connect remote`.
3. Paste `connectUrl`.
4. Paste collaborator token.

## 9. Approval Operations (Admin)

```bash
teamwork approvals list \
  --teamwork-url "http://127.0.0.1:8787" \
  --host-token "<TEAMWORK_HOST_TOKEN>"

teamwork approvals reply <approval-id> --allow \
  --teamwork-url "http://127.0.0.1:8787" \
  --host-token "<TEAMWORK_HOST_TOKEN>"
```

## 10. Firewall Baseline

Allow only your LAN to access TeamWork port.

Example (`ufw`, adapt CIDR):

```bash
sudo ufw allow from 10.0.0.0/8 to any port 8787 proto tcp
sudo ufw deny 8787/tcp
sudo ufw status
```

If using nginx on `80/443`, restrict those similarly to LAN or VPN ranges.

## 11. Upgrade Procedure

```bash
cd /opt/teamwork/teamwork
git fetch --all
git pull --ff-only origin dev
pnpm install
sudo systemctl restart teamwork-team.service
```

## 12. Token Rotation

Regenerate and update `/etc/teamwork/teamwork.env`:

1. `TEAMWORK_TOKEN` (collaborators reconnect with new token)
2. `TEAMWORK_HOST_TOKEN` (admin scripts use new token)

Then restart:

```bash
sudo systemctl restart teamwork-team.service
```

