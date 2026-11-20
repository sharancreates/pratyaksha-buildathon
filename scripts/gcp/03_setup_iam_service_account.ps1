param (
  [string]$ProjectId = (gcloud config get-value project 2>$null),
  [string]$SaName = "sa-pratyaksha-runtime"
)
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  Write-Error "Error: ProjectId required. Usage: .\03_setup_iam_service_account.ps1 -ProjectId <PROJECT_ID>"
  exit 1
}

$SaEmail = "$SaName@$ProjectId.iam.gserviceaccount.com"
Write-Host "Configuring runtime service account: $SaEmail..." -ForegroundColor Cyan

$exists = gcloud iam service-accounts describe $SaEmail --project=$ProjectId 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Service account $SaEmail already exists." -ForegroundColor Yellow
} else {
  Write-Host "Creating service account $SaName..."
  gcloud iam service-accounts create $SaName `
    --project=$ProjectId `
    --display-name="PRATYAKSHA Production Runtime Service Account" `
    --description="Minimal privilege identity for Cloud Run web and geospatial services"
}

$Roles = @(
  "roles/secretmanager.secretAccessor",
  "roles/cloudsql.client",
  "roles/datastore.user",
  "roles/run.invoker"
)

foreach ($role in $Roles) {
  Write-Host "-> Binding $role..."
  gcloud projects add-iam-policy-binding $ProjectId `
    --member="serviceAccount:$SaEmail" `
    --role="$role" `
    --condition=None `
    --quiet > $null
}

Write-Host "All IAM roles bound successfully to $SaEmail." -ForegroundColor Green
