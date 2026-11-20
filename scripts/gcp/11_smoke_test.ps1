[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$TargetUrl
)

$ErrorActionPreference = "Stop"

if (-not $TargetUrl) {
    try {
        $TargetUrl = (gcloud run services describe pratyaksha-web-service --region=asia-south1 --format="value(status.url)" 2>$null).Trim()
    } catch {}
    if (-not $TargetUrl) {
        $TargetUrl = "http://localhost:3000"
    }
}

$TargetUrl = $TargetUrl.TrimEnd('/')

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "PRATYAKSHA Live Production Smoke Test Harness" -ForegroundColor Cyan
Write-Host "Target: $TargetUrl"
Write-Host "Time:   $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))"
Write-Host "==========================================================" -ForegroundColor Cyan

$Total = 0
$Failed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Path,
        [string]$ExpectedKeyword
    )

    $script:Total++
    Write-Host -NoNewline "[Test $script:Total] $Name ($Path)... "

    $url = "$TargetUrl$Path"
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 15
        $jsonStr = $response | ConvertTo-Json -Depth 5 -Compress

        if ($ExpectedKeyword -and ($jsonStr -notmatch $ExpectedKeyword)) {
            Write-Host "FAILED (Missing keyword '$ExpectedKeyword')" -ForegroundColor Red
            $script:Failed++
        } else {
            Write-Host "PASSED (HTTP 200)" -ForegroundColor Green
        }
    } catch {
        Write-Host "FAILED ($($_.Exception.Message))" -ForegroundColor Red
        $script:Failed++
    }
}

Test-Endpoint -Name "Platform Health Check" -Path "/api/health" -ExpectedKeyword "healthy"
Test-Endpoint -Name "System Status & Metros" -Path "/api/system/status" -ExpectedKeyword "PRATYAKSHA"
Test-Endpoint -Name "Overview Dashboard (Ahmedabad)" -Path "/api/dashboard/overview?municipality=ahmedabad" -ExpectedKeyword "ahmedabad"
Test-Endpoint -Name "ML Anomaly Consensus" -Path "/api/ml/anomalies?municipality=ahmedabad" -ExpectedKeyword "anomalies"
Test-Endpoint -Name "Historical Telemetry Series" -Path "/api/forecast/history?municipality=mumbai" -ExpectedKeyword "observations"
Test-Endpoint -Name "Urban Heat Island Analytics" -Path "/api/analytics/heat-island?municipality=delhi" -ExpectedKeyword "Urban Heat Islands"

Write-Host "==========================================================" -ForegroundColor Cyan
if ($Failed -eq 0) {
    Write-Host "All $Total Smoke Tests PASSED! Deployment is healthy & operational." -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "$Failed of $Total Smoke Tests FAILED! Check service logs." -ForegroundColor Red
    Write-Host "==========================================================" -ForegroundColor Cyan
    exit 1
}
