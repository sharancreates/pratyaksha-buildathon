#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${2:-asia-south1}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID not provided. Usage: ./setup_all.sh <PROJECT_ID> [REGION]"
  exit 1
fi

echo "=========================================================="
echo "PRATYAKSHA GCP Foundation Setup: ${PROJECT_ID} (${REGION})"
echo "=========================================================="

bash "${SCRIPT_DIR}/01_enable_apis.sh" "$PROJECT_ID"
bash "${SCRIPT_DIR}/02_create_artifact_registry.sh" "$PROJECT_ID" "$REGION" "pratyaksha-repo"
bash "${SCRIPT_DIR}/03_setup_iam_service_account.sh" "$PROJECT_ID" "sa-pratyaksha-runtime"
bash "${SCRIPT_DIR}/04_configure_secrets.sh" "$PROJECT_ID"

echo "=========================================================="
echo "PRATYAKSHA GCP Foundation Initialized Successfully!"
echo "Next: Provision Cloud SQL PostGIS (Phase 5)."
echo "=========================================================="
