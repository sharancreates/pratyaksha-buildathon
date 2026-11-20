param (
  [string]$ProjectId = (gcloud config get-value project 2>$null)
)
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  Write-Error "Error: ProjectId required. Usage: .\04_configure_secrets.ps1 -ProjectId <PROJECT_ID>"
  exit 1
}

Write-Host "Provisioning Google Secret Manager slots for project: $ProjectId..." -ForegroundColor Cyan

$Secrets = @("DATABASE_URL", "GEE_SERVICE_ACCOUNT_KEY", "FIREBASE_CONFIG")

foreach ($sec in $Secrets) {
  $exists = gcloud secrets describe $sec --project=$ProjectId 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Secret '$sec' already exists." -ForegroundColor Yellow
  } else {
    Write-Host "-> Creating secret slot '$sec'..."
    gcloud secrets create $sec --project=$ProjectId --replication-policy="automatic"
  }
}

Write-Host "All Secret Manager slots initialized." -ForegroundColor Green
