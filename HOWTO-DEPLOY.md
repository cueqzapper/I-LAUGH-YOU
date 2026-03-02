# HOWTO: Deploy I-LAUGH-YOU

Target: Private server `192.168.20.50` + Cloudflare Tunnel to `i-laugh-you.com`

---

## For future deploys:

```powershell
cd G:\I-LAUGH-YOU\i-laugh-you
.\scripts\deploy-server.ps1
```

---

## Prerequisites

- SSH access to `engineer@192.168.20.50`
- Docker + Docker Compose installed on the server
- Cloudflare account with `i-laugh-you.com` domain + tunnel created
- Git + tar on your local Windows machine

---

## One-Time Server Setup

### 1. Create the Cloudflare Tunnel

1. Go to **https://one.dash.cloudflare.com** > **Networks** > **Tunnels**
2. Create tunnel named `i-laugh-you`, choose **Cloudflared** connector
3. Copy the **Tunnel Token**
4. Add **Public Hostname**: `i-laugh-you.com` → `HTTP` → `ily-app:3000`

### 2. Create `.env.production` on the server

```bash
ssh engineer@192.168.20.50
sudo mkdir -p /srv/i-laugh-you/data
sudo nano /srv/i-laugh-you/.env.production
```

See `i-laugh-you/.env.production.example` for template. Key: use `TUNNEL_TOKEN=` (not `CLOUDFLARE_TUNNEL_TOKEN`).

### 3. Copy SQLite database and fix permissions

```bash
cd i-laugh-you
scp data/ily.sqlite engineer@192.168.20.50:/tmp/ily.sqlite
ssh engineer@192.168.20.50 "sudo cp /tmp/ily.sqlite /srv/i-laugh-you/data/ && sudo chown -R 1001:1001 /srv/i-laugh-you/data && sudo chmod 775 /srv/i-laugh-you/data && sudo chmod 664 /srv/i-laugh-you/data/*"
```

The container runs as uid 1001 — it needs write access to the data dir (SQLite WAL).

---

## Deploy (every time)

From `G:\I-LAUGH-YOU\i-laugh-you`:

```powershell
.\scripts\deploy-server.ps1
```

This will:
1. Create a tarball (excludes node_modules, .git, sqlite, .env files)
2. Upload to server
3. Build Docker image on server (with `NEXT_PUBLIC_*` build args from local `.env.production`)
4. Copy `docker-compose.prod.yml` to server
5. Restart the `ily-app` container
6. Clean up build artifacts

### First deploy — also start cloudflared:

```powershell
ssh engineer@192.168.20.50 "cd /srv/i-laugh-you && sudo docker compose up -d cloudflared"
```

---

## Verify

```bash
# Container status
ssh engineer@192.168.20.50 "docker ps --filter 'name=i-laugh-you' --filter 'name=ily-cloudflared'"

# App health
ssh engineer@192.168.20.50 "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"

# Tunnel connection
ssh engineer@192.168.20.50 "docker logs ily-cloudflared 2>&1 | grep Registered"

# Public URL
curl https://i-laugh-you.com
```

---

## Useful Commands

```bash
# View logs
ssh engineer@192.168.20.50 "docker logs -f i-laugh-you"
ssh engineer@192.168.20.50 "docker logs -f ily-cloudflared"

# Restart app only
ssh engineer@192.168.20.50 "sudo docker restart i-laugh-you"

# Stop everything
ssh engineer@192.168.20.50 "cd /srv/i-laugh-you && sudo docker compose down"
```

---

## Architecture

```
[Your PC] --(deploy script)--> [192.168.20.50]
                                    |
                                    +-- i-laugh-you     (Next.js on :3000, internal only)
                                    |       +-- /app/data/ily.sqlite (volume)
                                    |
                                    +-- ily-cloudflared (tunnel → Cloudflare edge)
                                                           |
                                                           +--> i-laugh-you.com (HTTPS)
```

No ports exposed to the internet. Cloudflare Tunnel creates outbound connections.

---

## Notes

- `NEXT_PUBLIC_*` vars are baked at **build time** → need `--build` to change them
- Server-only vars (`STRIPE_SECRET_KEY`, etc.) are read at **runtime** → just restart
- SQLite needs the data dir writable by uid 1001 (container's `nextjs` user)
- Port 3000 is only exposed inside the Docker network, not on the host
