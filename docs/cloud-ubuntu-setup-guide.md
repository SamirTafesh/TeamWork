# TeamWork Cloud Setup Guide (Ubuntu VM + Nginx + Cloudflare Tunnel, No Daytona)

After deployment is complete, continue with the product onboarding guide:
- [TeamWork Cloud User Guide (account, billing, org, providers, skills, sharing)](./teamwork-cloud-user-guide.md)

This guide deploys a self-hosted TeamWork Cloud stack on one Ubuntu VM using:

1. `Nginx` as reverse proxy
2. `Cloudflare Tunnel` as public ingress
3. Docker Compose for TeamWork services
4. `PROVISIONER_MODE=stub` (no Daytona)

Recommended public hostnames:

1. `teamwork.aitech-services.com` -> Den web app
2. `api-teamwork.aitech-services.com` -> Den API

Optional later (only if you migrate to Daytona):

1. `workers.aitech-services.com` -> Den worker proxy

## 0. What You Will Deploy

Services deployed in this guide:

1. `den-web` (Next.js cloud UI)
2. `den-api` (control plane + auth)
3. MySQL 8.4

Optional service (not started in stub mode):

1. `den-worker-proxy` (Daytona-only worker preview proxy)

Ingress path:

1. Cloudflare Edge -> Cloudflare Tunnel (`cloudflared`) -> Nginx (`127.0.0.1:8080`) -> TeamWork containers

## 1. Prerequisites

On your Ubuntu VM:

1. Ubuntu 22.04+ with sudo access
2. Domain managed by Cloudflare DNS
3. DNS hostnames ready:
   - `teamwork.aitech-services.com`
   - `api-teamwork.aitech-services.com`
4. Outbound internet allowed from VM

Firewall notes:

1. Inbound `80/443` are not required with Cloudflare Tunnel.
2. Keep SSH (`22`) open for administration.

## 2. SSH Into VM And Install Base Packages

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release jq git openssl
```

## 3. Install Docker + Compose Plugin

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in once so Docker group membership applies.

## 4. Install Nginx And Cloudflared

Install Nginx:

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

Install Cloudflared:

```bash
ARCH="$(dpkg --print-architecture)"
if [ "$ARCH" = "amd64" ]; then
  CF_PKG="cloudflared-linux-amd64.deb"
elif [ "$ARCH" = "arm64" ]; then
  CF_PKG="cloudflared-linux-arm64.deb"
else
  echo "Unsupported architecture: $ARCH" >&2
  exit 1
fi

curl -fsSL -o /tmp/cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/${CF_PKG}"
sudo dpkg -i /tmp/cloudflared.deb || sudo apt-get -f install -y
cloudflared --version
```

## 5. Clone Your Fork On VM

```bash
sudo mkdir -p /opt/teamwork
sudo chown -R "$USER":"$USER" /opt/teamwork
cd /opt/teamwork
git clone git@github.com:SamirTafesh/teamwork.git
cd teamwork
git checkout dev
```

## 6. Prepare Cloud Deployment Files

Templates in this repo:

1. `deployment/cloud/docker-compose.cloud.yml`
2. `deployment/cloud/.env.cloud.example`
3. `deployment/cloud/nginx-teamwork.conf.example`

Create runtime env file:

```bash
cd /opt/teamwork/teamwork
cp deployment/cloud/.env.cloud.example deployment/cloud/.env.cloud
```

Generate strong secrets:

```bash
AUTH_SECRET="$(openssl rand -hex 48)"
DB_ENC_KEY="$(openssl rand -hex 64)"
echo "$AUTH_SECRET"
echo "$DB_ENC_KEY"
```

Edit `deployment/cloud/.env.cloud` and set:

1. Domains and URLs:
   - `APP_DOMAIN=teamwork.aitech-services.com`
   - `API_DOMAIN=api-teamwork.aitech-services.com`
   - `APP_PUBLIC_URL=https://teamwork.aitech-services.com`
   - `API_PUBLIC_URL=https://api-teamwork.aitech-services.com`
2. `MYSQL_ROOT_PASSWORD`
3. `BETTER_AUTH_SECRET` (use `AUTH_SECRET`)
4. `DEN_DB_ENCRYPTION_KEY` (use `DB_ENC_KEY`)
5. `CORS_ORIGINS` and `DEN_BETTER_AUTH_TRUSTED_ORIGINS`:
   - `https://teamwork.aitech-services.com`
6. Email provider (required for email/password auth in non-dev mode):
   - Preferred SMTP config:
     - `SMTP_HOST=<your-smtp-host>`
     - `SMTP_PORT=587`
     - `SMTP_SECURE=false` (set `true` if your SMTP server requires SMTPS)
     - `SMTP_USER=<smtp-username>` (optional if relay is IP-whitelisted/no-auth)
     - `SMTP_PASS=<smtp-password>`
     - `SMTP_FROM="TeamWork <no-reply@aitech-services.com>"`
     - `SMTP_REPLY_TO=<optional-reply-to-address>`
   - Optional Loops fallback (only used when SMTP is not configured):
     - `LOOPS_API_KEY`
     - `LOOPS_TRANSACTIONAL_ID_DEN_VERIFY_EMAIL`
     - `LOOPS_TRANSACTIONAL_ID_DEN_ORG_INVITE_EMAIL`
7. Keep stub mode:
   - `PROVISIONER_MODE=stub`
   - Optional `WORKER_URL_TEMPLATE` (placeholder URL format)

Important expectation in stub mode:

1. Cloud worker launch/provisioning is not active.
2. This setup is for hosted app/API, auth, org management, and control plane usage without Daytona.

## 7. Configure Nginx Reverse Proxy

Copy Nginx template:

```bash
sudo cp deployment/cloud/nginx-teamwork.conf.example /etc/nginx/sites-available/teamwork.conf
```

Edit `/etc/nginx/sites-available/teamwork.conf` and replace:

1. `app.example.com` -> `teamwork.aitech-services.com`
2. `api.example.com` -> `api-teamwork.aitech-services.com`

Enable site and reload:

```bash
sudo ln -sfn /etc/nginx/sites-available/teamwork.conf /etc/nginx/sites-enabled/teamwork.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager
```

## 8. Create Cloudflare Tunnel And DNS Records

Create the tunnel in Cloudflare Zero Trust:

1. Go to Cloudflare Dashboard -> Zero Trust -> Networks -> Tunnels.
2. Create tunnel (type: `cloudflared`).
3. Add public hostnames:
   - `teamwork.aitech-services.com` -> `http://localhost:8080`
   - `api-teamwork.aitech-services.com` -> `http://localhost:8080`
4. Copy Linux connector install command with token:
   - `cloudflared service install <TUNNEL_TOKEN>`

Cloudflare will create DNS records automatically when you add those public hostnames. Verify in Cloudflare DNS:

1. `teamwork` CNAME -> `<tunnel-id>.cfargotunnel.com` (proxied)
2. `api-teamwork` CNAME -> `<tunnel-id>.cfargotunnel.com` (proxied)

If records are missing, create them manually in Cloudflare DNS:

1. Type: `CNAME`, Name: `teamwork`, Target: `<tunnel-id>.cfargotunnel.com`, Proxy: on
2. Type: `CNAME`, Name: `api-teamwork`, Target: `<tunnel-id>.cfargotunnel.com`, Proxy: on

Run on VM:

```bash
sudo cloudflared service install <TUNNEL_TOKEN>
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager
```

Tail tunnel logs:

```bash
sudo journalctl -u cloudflared -f
```

DNS check from terminal:

```bash
dig +short teamwork.aitech-services.com
dig +short api-teamwork.aitech-services.com
```

Expected: both resolve through Cloudflare (typically to proxied Cloudflare addresses).

## 9. Start Cloud Stack

```bash
cd /opt/teamwork/teamwork
docker compose \
  --env-file deployment/cloud/.env.cloud \
  -f deployment/cloud/docker-compose.cloud.yml \
  up -d --build
```

Check status:

```bash
docker compose \
  --env-file deployment/cloud/.env.cloud \
  -f deployment/cloud/docker-compose.cloud.yml \
  ps
```

Follow logs:

```bash
docker compose \
  --env-file deployment/cloud/.env.cloud \
  -f deployment/cloud/docker-compose.cloud.yml \
  logs -f --tail=150 den-api den-web
```

## 10. Smoke Tests

From VM container ports:

```bash
curl -fsS http://127.0.0.1:8788/health
curl -fsS http://127.0.0.1:3005/api/den/health
```

From VM via Nginx host routing:

```bash
curl -fsS -H "Host: api-teamwork.aitech-services.com" http://127.0.0.1:8080/health
curl -fsS -H "Host: teamwork.aitech-services.com" http://127.0.0.1:8080/api/den/health
```

From your laptop/public internet:

```bash
curl -fsS https://api-teamwork.aitech-services.com/health
curl -I https://teamwork.aitech-services.com
```

Expected:

1. API `/health` returns success JSON.
2. App domain returns HTTP 200.

## 11. First User Sign-In And Team Bootstrap

Open:

1. `https://teamwork.aitech-services.com`

Auth notes:

1. Email/password flow in non-dev mode requires an outbound mail provider:
   - SMTP (recommended): set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` (+ `SMTP_USER`/`SMTP_PASS` when auth is required)
   - Loops fallback: set `LOOPS_API_KEY`, `LOOPS_TRANSACTIONAL_ID_DEN_VERIFY_EMAIL`, `LOOPS_TRANSACTIONAL_ID_DEN_ORG_INVITE_EMAIL`
2. If no mail provider is configured, use social auth (GitHub/Google) by setting OAuth vars.

## 12. Enable Auto-Start On Reboot

Cloudflared is already managed by systemd after `service install`.

Create `/etc/systemd/system/teamwork-cloud.service`:

```ini
[Unit]
Description=TeamWork Cloud Stack
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/teamwork/teamwork
ExecStart=/usr/bin/docker compose --env-file deployment/cloud/.env.cloud -f deployment/cloud/docker-compose.cloud.yml up -d
ExecStop=/usr/bin/docker compose --env-file deployment/cloud/.env.cloud -f deployment/cloud/docker-compose.cloud.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now teamwork-cloud.service
```

## 13. Upgrade Procedure

```bash
cd /opt/teamwork/teamwork
git fetch --all
git checkout dev
git pull --ff-only origin dev

docker compose \
  --env-file deployment/cloud/.env.cloud \
  -f deployment/cloud/docker-compose.cloud.yml \
  up -d --build
```

## 14. Backup And Restore Basics

Backup MySQL:

```bash
cd /opt/teamwork/teamwork
docker compose \
  --env-file deployment/cloud/.env.cloud \
  -f deployment/cloud/docker-compose.cloud.yml \
  exec -T mysql \
  sh -lc 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  > /opt/teamwork/den-backup.sql
```

Restore:

```bash
cd /opt/teamwork/teamwork
cat /opt/teamwork/den-backup.sql | docker compose \
  --env-file deployment/cloud/.env.cloud \
  -f deployment/cloud/docker-compose.cloud.yml \
  exec -T mysql \
  sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

## 15. Common Issues

1. `provider_not_configured` on signup:
   - Configure SMTP vars (recommended) or Loops vars, or use OAuth providers.
2. Tunnel is healthy but domain returns `502`:
   - Check Nginx is running and listening on `127.0.0.1:8080`.
   - Verify tunnel public hostname target is `http://localhost:8080`.
3. Worker launch does not become healthy in stub mode:
   - This is expected with `PROVISIONER_MODE=stub` because no real cloud worker provider is configured.
4. OAuth callback mismatch:
   - Ensure callback URL is `https://teamwork.aitech-services.com/api/auth/callback/<provider>`.

## 16. Optional: Migrate To Daytona Later

If you later decide to enable Daytona:

1. Set `PROVISIONER_MODE=daytona` in `deployment/cloud/.env.cloud`.
2. Fill `DAYTONA_API_KEY`, `DAYTONA_TARGET`, `DAYTONA_SNAPSHOT`, and `DAYTONA_WORKER_PROXY_BASE_URL`.
3. Build runtime snapshot:

```bash
cd /opt/teamwork/teamwork
export DAYTONA_API_KEY="<your-daytona-api-key>"
export DAYTONA_TARGET="<your-daytona-target>"
./scripts/create-daytona-teamwork-snapshot.sh
```

4. Uncomment workers server block in `deployment/cloud/nginx-teamwork.conf.example` and apply to Nginx config.
5. Add tunnel hostname `workers.aitech-services.com` -> `http://localhost:8080`.
6. Start with Daytona profile enabled:

```bash
cd /opt/teamwork/teamwork
docker compose \
  --profile daytona \
  --env-file deployment/cloud/.env.cloud \
  -f deployment/cloud/docker-compose.cloud.yml \
  up -d --build
```
