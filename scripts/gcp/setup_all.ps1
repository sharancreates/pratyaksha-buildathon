param (
  [string]$ProjectId = (gcloud config get-value project 2>$null),
  [string]$Region = "asia-south1"
)
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  Write-Error "Error: ProjectId not provided. Usage: .\setup_all.ps1 -ProjectId <PROJECT_ID> [-Region asia-south1]"
  exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "PRATYAKSHA GCP Foundation Setup: $ProjectId ($Region)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

& "$ScriptDir\01_enable_apis.ps1" -ProjectId $ProjectId
& "$ScriptDir\02_create_artifact_registry.ps1" -ProjectId $ProjectId -Region $Region
& "$ScriptDir\03_setup_iam_service_account.ps1" -ProjectId $ProjectId
& "$ScriptDir\04_configure_secrets.ps1" -ProjectId $ProjectId

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "PRATYAKSHA GCP Foundation Initialized Successfully!" -ForegroundColor Green
Write-Host "Next: Provision Cloud SQL PostGIS (Phase 5)." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
