# Deploy I-LAUGH-YOU to self-hosted server (192.168.20.50)
# Usage: .\scripts\deploy-server.ps1

$ErrorActionPreference = "Stop"

$SERVER = "engineer@192.168.20.50"
$SERVER_PATH = "/srv/i-laugh-you"
$SERVER_PW = "la09lkadj-dsasadioAlkajsdAOIAA-AKL"
$BUILD_PATH = "/tmp/ily-build"
$IMAGE = "ilaughyou/app"

# Build version
$DEPLOY_DATE = Get-Date -Format "yyyy-MM-dd"
$BUILD_NUMBER = Get-Date -Format "yyyyMMdd.HHmm"
$TAG = "v$BUILD_NUMBER"

Write-Host "`n=== DEPLOYING I-LAUGH-YOU ===" -ForegroundColor Green
Write-Host "Version: $TAG ($DEPLOY_DATE)`n" -ForegroundColor Cyan

# Step 1: Create tarball
Write-Host "[1/6] Creating deployment package..." -ForegroundColor Yellow

$tempDir = [System.IO.Path]::GetTempPath()
$tarFile = Join-Path $tempDir "ily-deploy.tar.gz"

& "$env:SystemRoot\System32\tar.exe" --exclude='node_modules' `
    --exclude='.next' `
    --exclude='.git' `
    --exclude='data/*.sqlite*' `
    --exclude='.env.local' `
    --exclude='.env.test' `
    --exclude='.env.production' `
    --exclude='*.log' `
    --exclude='.claude' `
    --exclude='docs' `
    --exclude='scripts/__pycache__' `
    -czf $tarFile .

if (-not $?) { throw "Failed to create tarball" }

# Step 2: Upload to server
Write-Host "[2/6] Uploading to server..." -ForegroundColor Yellow
scp $tarFile "${SERVER}:/tmp/ily-deploy.tar.gz"
if (-not $?) { throw "Failed to upload tarball" }

# Step 3: Extract on server
Write-Host "[3/6] Extracting on server..." -ForegroundColor Yellow
ssh $SERVER "rm -rf $BUILD_PATH && mkdir -p $BUILD_PATH && tar -xzf /tmp/ily-deploy.tar.gz -C $BUILD_PATH && rm /tmp/ily-deploy.tar.gz"
if (-not $?) { throw "Failed to extract on server" }

# Cleanup local tarball
Remove-Item $tarFile -Force

# Step 4: Build Docker image on server
Write-Host "[4/6] Building Docker image on server (this may take a few minutes)..." -ForegroundColor Yellow

# Read NEXT_PUBLIC_ vars from local .env.production (or .env.local as fallback)
$envFile = if (Test-Path ".env.production") { ".env.production" } else { ".env.local" }
$buildArgs = @()
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^(NEXT_PUBLIC_\w+)=(.+)$') {
        $buildArgs += "--build-arg"
        $buildArgs += "$($Matches[1])=$($Matches[2])"
    }
}
$buildArgsStr = ($buildArgs -join " ")

ssh $SERVER "echo '$SERVER_PW' | sudo -S docker build $buildArgsStr -t ${IMAGE}:${TAG} -t ${IMAGE}:latest $BUILD_PATH 2>&1"
if (-not $?) { throw "Failed to build Docker image" }

# Step 5: Setup server directory and deploy
Write-Host "[5/6] Deploying to $SERVER_PATH..." -ForegroundColor Yellow

# Create server directory and data dir if not exists
ssh $SERVER "echo '$SERVER_PW' | sudo -S mkdir -p $SERVER_PATH/data"

# Copy docker-compose.prod.yml to server
scp "docker-compose.prod.yml" "${SERVER}:/tmp/docker-compose.yml"
ssh $SERVER "echo '$SERVER_PW' | sudo -S cp /tmp/docker-compose.yml $SERVER_PATH/docker-compose.yml"

# Update image tag in .env on server (append to existing .env.production)
ssh $SERVER "echo '$SERVER_PW' | sudo -S bash -c 'grep -v ^ILY_IMAGE $SERVER_PATH/.env.production > /tmp/ily-env-tmp 2>/dev/null; echo ILY_IMAGE=${IMAGE}:${TAG} >> /tmp/ily-env-tmp; cp /tmp/ily-env-tmp $SERVER_PATH/.env.production'"

# Start/restart containers
ssh $SERVER "echo '$SERVER_PW' | sudo -S bash -c 'cd $SERVER_PATH && docker compose up -d ily-app' 2>&1"
if (-not $?) { throw "Failed to restart containers" }

# Step 6: Cleanup
Write-Host "[6/6] Cleaning up build artifacts..." -ForegroundColor Yellow
ssh $SERVER "rm -rf $BUILD_PATH"

Write-Host "`n=== DEPLOY COMPLETE ===" -ForegroundColor Green
Write-Host "Image: ${IMAGE}:${TAG}"
Write-Host "Server: $SERVER"
Write-Host "Local URL: http://192.168.20.50:3000"
Write-Host "Public URL: https://i-laugh-you.com`n" -ForegroundColor Cyan

Write-Host "Container status:" -ForegroundColor Yellow
ssh $SERVER "docker ps --filter 'name=i-laugh-you' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
