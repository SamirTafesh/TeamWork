# OpenWork Local Server Deployment Guide (LAN Team Host)

This guide deploys OpenWork on a local Ubuntu/Linux server so your whole team can connect to one shared host.

It covers:

1. Running OpenWork in shared mode on LAN
2. Keeping it always-on with `systemd`
3. Optional `nginx` reverse proxy
4. Team onboarding and token management

## 1. Deployment Model

Recommended for local office/home lab:

1. One Linux server hosts OpenWork.
2. OpenWork listens on LAN (`0.0.0.0:8787`).
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
/opt/openwork/openwork
```

Workspace path used below:

```bash
/srv/openwork/workspaces/main
```

## 3. Clone And Install

```bash
sudo mkdir -p /opt/openwork
sudo chown -R "$USER":"$USER" /opt/openwork
cd /opt/openwork
git clone git@github.com:SamirTafesh/openwork.git
cd openwork
pnpm install
```

Create workspace folder:

```bash
sudo mkdir -p /srv/openwork/workspaces/main
sudo chown -R "$USER":"$USER" /srv/openwork/workspaces/main
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
sudo mkdir -p /etc/openwork
sudo tee /etc/openwork/openwork.env >/dev/null <<EOF
WORKSPACE_DIR=/srv/openwork/workspaces/main
OPENWORK_PORT=8787
OPENWORK_CONNECT_HOST=10.0.0.20
OPENWORK_TOKEN=${COLLAB_TOKEN}
OPENWORK_HOST_TOKEN=${HOST_TOKEN}
EOF
sudo chmod 600 /etc/openwork/openwork.env
```

Set `OPENWORK_CONNECT_HOST` to your server LAN IP or internal DNS name.

## 5. First Manual Start (Validation)

```bash
cd /opt/openwork/openwork
set -a
source /etc/openwork/openwork.env
set +a

pnpm --filter openwork-orchestrator dev -- \
  serve \
  --workspace "$WORKSPACE_DIR" \
  --remote-access \
  --openwork-host 0.0.0.0 \
  --openwork-port "$OPENWORK_PORT" \
  --connect-host "$OPENWORK_CONNECT_HOST" \
  --openwork-token "$OPENWORK_TOKEN" \
  --openwork-host-token "$OPENWORK_HOST_TOKEN" \
  --approval manual
```

Health check from host:

```bash
curl -fsS "http://127.0.0.1:${OPENWORK_PORT}/health"
```

Stop with `Ctrl+C` after validation.

## 6. Run As A Systemd Service (Always On)

Copy the example unit:

```bash
sudo cp deployment/local/openwork-team.service.example /etc/systemd/system/openwork-team.service
```

Edit `/etc/systemd/system/openwork-team.service`:

1. Set `User=` and `Group=` to your Linux account (or dedicated service account).
2. Confirm `WorkingDirectory=/opt/openwork/openwork`.

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openwork-team.service
sudo systemctl status openwork-team.service --no-pager
```

Follow logs:

```bash
journalctl -u openwork-team.service -f
```

## 7. Optional Nginx Reverse Proxy

Use nginx if you want a stable internal hostname and/or TLS termination.

Example config:

```bash
sudo cp deployment/local/nginx-openwork-lan.conf.example /etc/nginx/sites-available/openwork-lan.conf
sudo ln -sfn /etc/nginx/sites-available/openwork-lan.conf /etc/nginx/sites-enabled/openwork-lan.conf
sudo nginx -t
sudo systemctl restart nginx
```

If you proxy through nginx, set:

1. `OPENWORK_CONNECT_HOST` to the nginx hostname
2. `OPENWORK_PORT` to nginx listen port (for example `443` or `80`)

Then restart service:

```bash
sudo systemctl restart openwork-team.service
```

## 8. Team Onboarding

Share with teammates:

1. `connectUrl`: `http://<OPENWORK_CONNECT_HOST>:<OPENWORK_PORT>`
2. collaborator token: value of `OPENWORK_TOKEN`

Do not share:

1. `OPENWORK_HOST_TOKEN` (admin approvals token)

Client steps:

1. Open OpenWork desktop app.
2. `Add worker` -> `Connect remote`.
3. Paste `connectUrl`.
4. Paste collaborator token.

## 9. Approval Operations (Admin)

```bash
openwork approvals list \
  --openwork-url "http://127.0.0.1:8787" \
  --host-token "<OPENWORK_HOST_TOKEN>"

openwork approvals reply <approval-id> --allow \
  --openwork-url "http://127.0.0.1:8787" \
  --host-token "<OPENWORK_HOST_TOKEN>"
```

## 10. Firewall Baseline

Allow only your LAN to access OpenWork port.

Example (`ufw`, adapt CIDR):

```bash
sudo ufw allow from 10.0.0.0/8 to any port 8787 proto tcp
sudo ufw deny 8787/tcp
sudo ufw status
```

If using nginx on `80/443`, restrict those similarly to LAN or VPN ranges.

## 11. Upgrade Procedure

```bash
cd /opt/openwork/openwork
git fetch --all
git pull --ff-only origin dev
pnpm install
sudo systemctl restart openwork-team.service
```

## 12. Token Rotation

Regenerate and update `/etc/openwork/openwork.env`:

1. `OPENWORK_TOKEN` (collaborators reconnect with new token)
2. `OPENWORK_HOST_TOKEN` (admin scripts use new token)

Then restart:

```bash
sudo systemctl restart openwork-team.service
```

