param (
  [string]$ProjectId = (gcloud config get-value project 2>$null),
  [string]$Region = "asia-south1",
  [string]$RepoName = "pratyaksha-repo"
)
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  Write-Error "Error: ProjectId required. Usage: .\02_create_artifact_registry.ps1 -ProjectId <PROJECT_ID>"
  exit 1
}

Write-Host "Configuring Artifact Registry repository '$RepoName' in $Region ($ProjectId)..." -ForegroundColor Cyan

$exists = gcloud artifacts repositories describe $RepoName --project=$ProjectId --location=$Region 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Repository '$RepoName' already exists in $Region." -ForegroundColor Yellow
} else {
  Write-Host "Creating Docker repository '$RepoName'..."
  gcloud artifacts repositories create $RepoName `
    --project=$ProjectId `
    --location=$Region `
    --repository-format=docker `
    --description="PRATYAKSHA Docker images for Cloud Run services"
}

Write-Host "Configuring Docker authentication for $Region-docker.pkg.dev..."
gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet
