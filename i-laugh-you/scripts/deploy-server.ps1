# Deploy I-LAUGH-YOU via git-as-truth (no more tar-push).
# Usage (from G:\I-LAUGH-YOU\i-laugh-you):  .\scripts\deploy-server.ps1
#
# Server builds ily-app from the git checkout at /srv/i-laugh-you/repo (build
# context = i-laugh-you/ subdir). umami / db / cloudflared and the persistent
# data/ (sqlite, uploads) are NOT touched. You commit your work first; this
# pushes main and triggers the server build.

$ErrorActionPreference = "Stop"
$SERVER = "engineer@192.168.20.50"

$dirty = (git status --porcelain)
if ($dirty) {
  Write-Host "!  Uncommitted changes present — commit them first or they won't ship:" -ForegroundColor Yellow
  git status --short
  Write-Host ""
}

Write-Host "[1/2] Pushing main to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "[2/2] Building ily-app on the box from the git checkout..." -ForegroundColor Yellow
ssh $SERVER "bash /srv/i-laugh-you/repo/i-laugh-you/scripts/server/deploy.sh main"

Write-Host "`nDone -> https://i-laugh-you.com" -ForegroundColor Cyan
