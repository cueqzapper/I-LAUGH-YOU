#!/usr/bin/env bash
# I-LAUGH-YOU — deploy FROM the git checkout on the box (git-as-truth).
#
# Replaces the old tar-push (scripts/deploy-server.ps1). Repo checkout lives at
# /srv/i-laugh-you/repo; the app (Dockerfile) is the i-laugh-you/ subdir.
# Only the app container (ily-app) is rebuilt/restarted — umami/db/cloudflared
# and the persistent /srv/i-laugh-you/data (sqlite, blog uploads, umami-db) are
# NEVER touched.
#
#   Usage (on the box): bash /srv/i-laugh-you/repo/i-laugh-you/scripts/server/deploy.sh [branch]
set -euo pipefail

BRANCH="${1:-main}"
REPO=/srv/i-laugh-you/repo
APP="$REPO/i-laugh-you"          # build context (Dockerfile is here)
RUNDIR=/srv/i-laugh-you
IMAGE=ilaughyou/app

cd "$REPO"
git fetch --prune origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
TAG="git-$(git rev-parse --short HEAD)"

# NEXT_PUBLIC_* are baked into the client bundle at build time — take them from
# the runtime env on the box (same values that used to come from local .env).
BUILD_ARGS=""
while IFS= read -r line; do
  case "$line" in NEXT_PUBLIC_*) BUILD_ARGS="$BUILD_ARGS --build-arg ${line}";; esac
done < <(grep -E '^NEXT_PUBLIC_' "$RUNDIR/.env.production" 2>/dev/null || true)

echo "==> building $IMAGE:$TAG (context $APP)"
docker build $BUILD_ARGS -t "$IMAGE:$TAG" -t "$IMAGE:latest" "$APP"

# Runtime compose + secrets stay in place; we only point the image tag + restart the app.
export ILY_IMAGE="$IMAGE:latest"
cd "$RUNDIR"
docker compose up -d ily-app
docker compose ps --format 'table {{.Name}}\t{{.Status}}'
echo "Done → https://i-laugh-you.com"
