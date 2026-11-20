param (
  [string]$ProjectId = (gcloud config get-value project 2>$null),
  [string]$Region = "asia-south1",
  [string]$ConnectorName = "pratyaksha-vpc-conn",
  [string]$Range = "10.8.0.0/28",
  [string]$Network = "default"
)
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  Write-Error "Error: ProjectId required. Usage: .\08_setup_vpc_connector.ps1 -ProjectId <PROJECT_ID>"
  exit 1
}

Write-Host "Configuring Serverless VPC Access connector '$ConnectorName' in $Region..." -ForegroundColor Cyan

$exists = gcloud compute networks vpc-access connectors describe $ConnectorName --region=$Region --project=$ProjectId 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "VPC connector '$ConnectorName' already exists." -ForegroundColor Yellow
} else {
  Write-Host "Creating Serverless VPC Access connector '$ConnectorName'..."
  gcloud compute networks vpc-access connectors create $ConnectorName `
    --region=$Region `
    --range=$Range `
    --network=$Network `
    --project=$ProjectId `
    --min-instances=2 `
    --max-instances=3 `
    --machine-type="e2-micro" `
    --quiet
  Write-Host "VPC connector created successfully." -ForegroundColor Green
}
