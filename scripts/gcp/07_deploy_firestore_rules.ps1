param (
  [string]$ProjectId = (gcloud config get-value project 2>$null),
  [string]$Region = "asia-south1"
)
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  Write-Error "Error: ProjectId required. Usage: .\07_deploy_firestore_rules.ps1 -ProjectId <PROJECT_ID>"
  exit 1
}

Write-Host "Verifying Cloud Firestore database in Native Mode in $Region ($ProjectId)..." -ForegroundColor Cyan

$dbExists = gcloud firestore databases describe --project=$ProjectId 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Default Firestore database already exists." -ForegroundColor Yellow
} else {
  Write-Host "Creating Firestore database in Native mode in $Region..."
  gcloud firestore databases create `
    --project=$ProjectId `
    --location=$Region `
    --type=firestore-native
}

Write-Host "Deploying firestore.rules and composite indexes..." -ForegroundColor Cyan
if (Get-Command firebase -ErrorAction SilentlyContinue) {
  firebase deploy --only firestore:rules,firestore:indexes --project=$ProjectId
} else {
  Write-Host "Firebase CLI not detected; ensure firestore.rules is deployed via CI or console." -ForegroundColor Yellow
}

Write-Host "Firestore deployment configured successfully." -ForegroundColor Green
