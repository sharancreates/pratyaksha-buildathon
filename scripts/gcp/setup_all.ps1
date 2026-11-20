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
Write-Host "PRATYAKSHA GCP End-to-End Infrastructure & Deployment Pipeline" -ForegroundColor Cyan
Write-Host "Project: $ProjectId"
Write-Host "Region:  $Region"
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "[Phase 4] 1/10 Enabling APIs..." -ForegroundColor Yellow
& "$ScriptDir\01_enable_apis.ps1" -ProjectId $ProjectId

Write-Host "[Phase 4] 2/10 Configuring Artifact Registry..." -ForegroundColor Yellow
& "$ScriptDir\02_create_artifact_registry.ps1" -ProjectId $ProjectId -Region $Region

Write-Host "[Phase 4] 3/10 Configuring IAM Service Account..." -ForegroundColor Yellow
& "$ScriptDir\03_setup_iam_service_account.ps1" -ProjectId $ProjectId

Write-Host "[Phase 4] 4/10 Configuring Secret Manager..." -ForegroundColor Yellow
& "$ScriptDir\04_configure_secrets.ps1" -ProjectId $ProjectId

Write-Host "[Phase 5] 5/10 Provisioning Cloud SQL PostGIS..." -ForegroundColor Yellow
& "$ScriptDir\05_provision_cloud_sql.ps1" -ProjectId $ProjectId -Region $Region

Write-Host "[Phase 5] 6/10 Running PostGIS Schema Migrations..." -ForegroundColor Yellow
& "$ScriptDir\06_run_migrations.ps1" -ProjectId $ProjectId -Region $Region

Write-Host "[Phase 5] 7/10 Deploying Firestore Security Rules & Indexes..." -ForegroundColor Yellow
& "$ScriptDir\07_deploy_firestore_rules.ps1" -ProjectId $ProjectId -Region $Region

Write-Host "[Phase 6] 8/10 Provisioning Serverless VPC Access Connector..." -ForegroundColor Yellow
& "$ScriptDir\08_setup_vpc_connector.ps1" -ProjectId $ProjectId -Region $Region

Write-Host "[Phase 6] 9/10 Building & Pushing Multi-Service Docker Images..." -ForegroundColor Yellow
& "$ScriptDir\09_build_and_push_images.ps1" -ProjectId $ProjectId -Region $Region

Write-Host "[Phase 6] 10/10 Deploying Cloud Run Dual-Service Architecture..." -ForegroundColor Yellow
& "$ScriptDir\10_deploy_cloud_run.ps1" -ProjectId $ProjectId -Region $Region

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "PRATYAKSHA GCP Full Infrastructure Deployed Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
