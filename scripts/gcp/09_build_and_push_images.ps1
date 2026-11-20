[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$ProjectId,

    [Parameter(Position=1)]
    [string]$Region = "asia-south1",

    [Parameter(Position=2)]
    [string]$RepoName = "pratyaksha-repo",

    [Parameter(Position=3)]
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

if (-not $ProjectId) {
    try {
        $ProjectId = (gcloud config get-value project 2>$null).Trim()
    } catch {}
}

if (-not $ProjectId) {
    Write-Error "Error: ProjectId required. Usage: .\09_build_and_push_images.ps1 -ProjectId <PROJECT_ID> [-Region <REGION>] [-RepoName <REPO_NAME>] [-Tag <TAG>]"
    exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = (Resolve-Path "$ScriptDir\..\..").Path

$RegistryBase = "$Region-docker.pkg.dev/$ProjectId/$RepoName"
$WebImage = "$RegistryBase/pratyaksha-web:$Tag"
$GeoImage = "$RegistryBase/pratyaksha-geo:$Tag"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "PRATYAKSHA Container Build & Push Pipeline" -ForegroundColor Cyan
Write-Host "Project:  $ProjectId"
Write-Host "Region:   $Region"
Write-Host "Registry: $RegistryBase"
Write-Host "Tag:      $Tag"
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "Authenticating Docker for $Region-docker.pkg.dev..."
gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet

Write-Host "1/2 Building & Pushing PRATYAKSHA Web Service..." -ForegroundColor Yellow
docker build -t "$WebImage" -f "$RootDir\Dockerfile" "$RootDir"
if ($LASTEXITCODE -ne 0) { throw "Docker build failed for web service" }
docker push "$WebImage"
if ($LASTEXITCODE -ne 0) { throw "Docker push failed for web service" }
Write-Host "-> Web image pushed successfully: $WebImage" -ForegroundColor Green

Write-Host "2/2 Building & Pushing PRATYAKSHA Geospatial Backend Service..." -ForegroundColor Yellow
docker build -t "$GeoImage" -f "$RootDir\backend\Dockerfile" "$RootDir\backend"
if ($LASTEXITCODE -ne 0) { throw "Docker build failed for geo service" }
docker push "$GeoImage"
if ($LASTEXITCODE -ne 0) { throw "Docker push failed for geo service" }
Write-Host "-> Geo backend image pushed successfully: $GeoImage" -ForegroundColor Green

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Container images built and pushed successfully to Artifact Registry!" -ForegroundColor Green
Write-Host "Web: $WebImage"
Write-Host "Geo: $GeoImage"
Write-Host "==========================================================" -ForegroundColor Cyan
