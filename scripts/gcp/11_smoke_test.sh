#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-}"

if [ -z "$TARGET_URL" ]; then
  # Try resolving from gcloud if available, otherwise default to local
  if command -v gcloud >/dev/null 2>&1; then
    TARGET_URL="$(gcloud run services describe pratyaksha-web-service --region=asia-south1 --format="value(status.url)" 2>/dev/null || echo "")"
  fi
  if [ -z "$TARGET_URL" ]; then
    TARGET_URL="http://localhost:3000"
  fi
fi

# Strip trailing slash
TARGET_URL="${TARGET_URL%/}"

echo "=========================================================="
echo "PRATYAKSHA Live Production Smoke Test Harness"
echo "Target: ${TARGET_URL}"
echo "Time:   $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=========================================================="

FAILED=0
TOTAL=0

test_endpoint() {
  local name="$1"
  local path="$2"
  local expected_keyword="$3"
  TOTAL=$((TOTAL + 1))

  echo -n "[Test ${TOTAL}] ${name} (${path})... "
  local url="${TARGET_URL}${path}"

  local start_time
  start_time="$(date +%s%N 2>/dev/null || date +%s)"

  local response
  local http_code
  response=$(curl -s -w "\n%{http_code}" --max-time 15 "${url}" || echo -e "\n000")
  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ne 200 ]; then
    echo "FAILED (HTTP ${http_code})"
    echo "  Response: ${body:0:150}"
    FAILED=$((FAILED + 1))
    return
  fi

  if [ -n "$expected_keyword" ]; then
    if ! echo "$body" | grep -q "$expected_keyword"; then
      echo "FAILED (Missing keyword '${expected_keyword}')"
      echo "  Response snippet: ${body:0:150}"
      FAILED=$((FAILED + 1))
      return
    fi
  fi

  echo "PASSED (HTTP 200)"
}

# 1. API Health & Engine Mode
test_endpoint "Platform Health Check" "/api/health" "healthy"

# 2. System Status & Indian Municipal Jurisdictions
test_endpoint "System Status & Metros" "/api/system/status" "PRATYAKSHA"

# 3. Overview Dashboard (Ahmedabad)
test_endpoint "Overview Dashboard (Ahmedabad)" "/api/dashboard/overview?municipality=ahmedabad" "ahmedabad"

# 4. ML Anomaly Detection Consensus
test_endpoint "ML Anomaly Consensus" "/api/ml/anomalies?municipality=ahmedabad" "anomalies"

# 5. Predictive Forecast Historical Telemetry
test_endpoint "Historical Telemetry Series" "/api/forecast/history?municipality=mumbai" "observations"

# 6. Urban Heat Island Thermal Analytics
test_endpoint "Urban Heat Island Analytics" "/api/analytics/heat-island?municipality=delhi" "Urban Heat Islands"

echo "=========================================================="
if [ "$FAILED" -eq 0 ]; then
  echo "All ${TOTAL} Smoke Tests PASSED! Deployment is healthy & operational."
  echo "=========================================================="
  exit 0
else
  echo "${FAILED} of ${TOTAL} Smoke Tests FAILED! Check service logs."
  echo "=========================================================="
  exit 1
fi
