param (
  [string]$ProjectId = (gcloud config get-value project 2>$null)
)
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  Write-Error "Error: ProjectId not provided and cannot be inferred from gcloud config. Usage: .\01_enable_apis.ps1 -ProjectId <PROJECT_ID>"
  exit 1
}

Write-Host "Enabling required Google Cloud APIs for project: $ProjectId..." -ForegroundColor Cyan

$Apis = @(
  "run.googleapis.com",
  "artifactregistry.googleapis.com",
  "sqladmin.googleapis.com",
  "secretmanager.googleapis.com",
  "earthengine.googleapis.com",
  "iam.googleapis.com",
  "vpcaccess.googleapis.com",
  "cloudbuild.googleapis.com"
)

foreach ($api in $Apis) {
  Write-Host "-> Enabling $api..."
  gcloud services enable $api --project=$ProjectId
}

Write-Host "All 8 required GCP APIs enabled successfully." -ForegroundColor Green
