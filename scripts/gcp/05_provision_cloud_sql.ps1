param (
  [string]$ProjectId = (gcloud config get-value project 2>$null),
  [string]$Region = "asia-south1",
  [string]$InstanceName = "pratyaksha-db",
  [string]$DbName = "pratyaksha",
  [string]$DbUser = "pratyaksha_app",
  [string]$DbPass = "PratyakshaDB2026Pass"
)
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  Write-Error "Error: ProjectId required. Usage: .\05_provision_cloud_sql.ps1 -ProjectId <PROJECT_ID>"
  exit 1
}

Write-Host "Configuring Cloud SQL instance '$InstanceName' in $Region ($ProjectId)..." -ForegroundColor Cyan

$exists = gcloud sql instances describe $InstanceName --project=$ProjectId 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Cloud SQL instance '$InstanceName' already exists." -ForegroundColor Yellow
} else {
  Write-Host "Creating PostgreSQL 15 instance '$InstanceName'..."
  gcloud sql instances create $InstanceName `
    --project=$ProjectId `
    --database-version="POSTGRES_15" `
    --tier="db-custom-1-3840" `
    --region=$Region `
    --storage-size=20GB `
    --storage-type=SSD `
    --storage-auto-increase `
    --backup-start-time="02:00" `
    --database-flags="cloudsql.enable_pgaudit=on,shared_preload_libraries=pg_stat_statements" `
    --maintenance-window-day=SUN `
    --maintenance-window-hour=03 `
    --quiet
}

Write-Host "Ensuring database '$DbName' exists..."
$dbExists = gcloud sql databases describe $DbName --instance=$InstanceName --project=$ProjectId 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Database '$DbName' exists." -ForegroundColor Yellow
} else {
  gcloud sql databases create $DbName --instance=$InstanceName --project=$ProjectId
}

Write-Host "Ensuring user '$DbUser' exists..."
$users = gcloud sql users list --instance=$InstanceName --project=$ProjectId --format="value(name)" 2>$null
if ($users -match "\b$DbUser\b") {
  Write-Host "User '$DbUser' exists." -ForegroundColor Yellow
} else {
  gcloud sql users create $DbUser --instance=$InstanceName --project=$ProjectId --password=$DbPass
}

$dbUrl = "postgresql://${DbUser}:${DbPass}@/${DbName}?host=/cloudsql/${ProjectId}:${Region}:${InstanceName}"
[System.IO.File]::WriteAllText("$env:TEMP\db_url.tmp", $dbUrl)
gcloud secrets versions add DATABASE_URL --data-file="$env:TEMP\db_url.tmp" --project=$ProjectId 2>$null
Remove-Item "$env:TEMP\db_url.tmp" -Force -ErrorAction SilentlyContinue

Write-Host "DATABASE_URL secret updated in Secret Manager." -ForegroundColor Green
