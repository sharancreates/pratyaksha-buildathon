param (
  [string]$ProjectId = (gcloud config get-value project 2>$null),
  [string]$InstanceName = "pratyaksha-db",
  [string]$DbName = "pratyaksha",
  [string]$DbUser = "pratyaksha_app"
)
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  Write-Error "Error: ProjectId required. Usage: .\06_run_migrations.ps1 -ProjectId <PROJECT_ID>"
  exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$MigrationFile = Join-Path $RootDir "backend\database\migrations\001_init_postgis.sql"

if (-not (Test-Path $MigrationFile)) {
  Write-Error "Error: Migration file not found at $MigrationFile"
  exit 1
}

Write-Host "Running PostGIS spatial migrations against $InstanceName/$DbName..." -ForegroundColor Cyan

Get-Content $MigrationFile | gcloud sql connect $InstanceName `
  --project=$ProjectId `
  --database=$DbName `
  --user=$DbUser

Write-Host "Migrations executed successfully." -ForegroundColor Green
