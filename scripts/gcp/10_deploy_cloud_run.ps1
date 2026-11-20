[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$ProjectId,

    [Parameter(Position=1)]
    [string]$Region = "asia-south1",

    [Parameter(Position=2)]
    [string]$RepoName = "pratyaksha-repo",

    [Parameter(Position=3)]
    [string]$Tag = "latest",

    [Parameter(Position=4)]
    [string]$VpcConnector = "pratyaksha-vpc-conn",

    [Parameter(Position=5)]
    [string]$SaName = "sa-pratyaksha-runtime",

    [Parameter(Position=6)]
    [string]$DbInstance = "pratyaksha-db"
)

$ErrorActionPreference = "Stop"

if (-not $ProjectId) {
    try {
        $ProjectId = (gcloud config get-value project 2>$null).Trim()
    } catch {}
}

if (-not $ProjectId) {
    Write-Error "Error: ProjectId required. Usage: .\10_deploy_cloud_run.ps1 -ProjectId <PROJECT_ID>"
    exit 1
}

$SaEmail = "$SaName@$ProjectId.iam.gserviceaccount.com"
$RegistryBase = "$Region-docker.pkg.dev/$ProjectId/$RepoName"
$GeoImage = "$RegistryBase/pratyaksha-geo:$Tag"
$WebImage = "$RegistryBase/pratyaksha-web:$Tag"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "PRATYAKSHA Cloud Run Dual-Service Deployment" -ForegroundColor Cyan
Write-Host "Project:       $ProjectId"
Write-Host "Region:        $Region"
Write-Host "VPC Connector: $VpcConnector"
Write-Host "Runtime SA:    $SaEmail"
Write-Host "==========================================================" -ForegroundColor Cyan

# Inspect secrets presence
$hasDbSecret = $false
$hasGeeSecret = $false
try {
    $null = gcloud secrets describe DATABASE_URL --project="$ProjectId" 2>$null
    if ($LASTEXITCODE -eq 0) { $hasDbSecret = $true }
} catch {}
try {
    $null = gcloud secrets describe GEE_SERVICE_ACCOUNT_KEY --project="$ProjectId" 2>$null
    if ($LASTEXITCODE -eq 0) { $hasGeeSecret = $true }
} catch {}

$secretParam = ""
if ($hasDbSecret -and $hasGeeSecret) {
    $secretParam = "--set-secrets=DATABASE_URL=DATABASE_URL:latest,GEE_SERVICE_ACCOUNT_KEY=GEE_SERVICE_ACCOUNT_KEY:latest"
} elseif ($hasDbSecret) {
    $secretParam = "--set-secrets=DATABASE_URL=DATABASE_URL:latest"
}

# 1. Deploy Geo service
Write-Host "1/3 Deploying pratyaksha-geo-service (Python FastAPI + GEE)..." -ForegroundColor Yellow
$geoDeployArgs = @(
    "run", "deploy", "pratyaksha-geo-service",
    "--image=$GeoImage",
    "--region=$Region",
    "--project=$ProjectId",
    "--service-account=$SaEmail",
    "--cpu=2",
    "--memory=2Gi",
    "--port=8000",
    "--min-instances=0",
    "--max-instances=5",
    "--ingress=internal-and-cloud-load-balancing",
    "--vpc-connector=$VpcConnector",
    "--vpc-egress=private-ranges-only",
    "--add-cloudsql-instances=$ProjectId`:$Region`:$DbInstance",
    "--no-allow-unauthenticated",
    "--quiet"
)
if ($secretParam) {
    $geoDeployArgs += $secretParam
}

& gcloud @geoDeployArgs
if ($LASTEXITCODE -ne 0) { throw "Cloud Run deployment failed for pratyaksha-geo-service" }

$GeoUrl = (gcloud run services describe pratyaksha-geo-service --region="$Region" --project="$ProjectId" --format="value(status.url)").Trim()
Write-Host "-> pratyaksha-geo-service deployed at: $GeoUrl" -ForegroundColor Green

# 2. Grant Invoker Permissions
Write-Host "2/3 Granting roles/run.invoker to $SaEmail on pratyaksha-geo-service..." -ForegroundColor Yellow
gcloud run services add-iam-policy-binding pratyaksha-geo-service `
    --region="$Region" `
    --project="$ProjectId" `
    --member="serviceAccount:$SaEmail" `
    --role="roles/run.invoker" `
    --quiet

# 3. Deploy Web Service
Write-Host "3/3 Deploying pratyaksha-web-service (Node.js/Express + React)..." -ForegroundColor Yellow
gcloud run deploy pratyaksha-web-service `
    --image="$WebImage" `
    --region="$Region" `
    --project="$ProjectId" `
    --service-account="$SaEmail" `
    --cpu=1 `
    --memory=512Mi `
    --port=3000 `
    --min-instances=0 `
    --max-instances=10 `
    --ingress=all `
    --allow-unauthenticated `
    --set-env-vars="NODE_ENV=production,GEO_BACKEND_URL=$GeoUrl" `
    --quiet
if ($LASTEXITCODE -ne 0) { throw "Cloud Run deployment failed for pratyaksha-web-service" }

$WebUrl = (gcloud run services describe pratyaksha-web-service --region="$Region" --project="$ProjectId" --format="value(status.url)").Trim()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "PRATYAKSHA Cloud Run Deployment Successful!" -ForegroundColor Green
Write-Host "Web Service (Public):   $WebUrl"
Write-Host "Geo Backend (Internal): $GeoUrl"
Write-Host "==========================================================" -ForegroundColor Cyan
