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
echo "PRATYAKSHA GCP End-to-End Infrastructure & Deployment Pipeline"
echo "Project: ${PROJECT_ID}"
echo "Region:  ${REGION}"
echo "=========================================================="

echo "[Phase 4] 1/10 Enabling APIs..."
bash "${SCRIPT_DIR}/01_enable_apis.sh" "$PROJECT_ID"

echo "[Phase 4] 2/10 Configuring Artifact Registry..."
bash "${SCRIPT_DIR}/02_create_artifact_registry.sh" "$PROJECT_ID" "$REGION" "pratyaksha-repo"

echo "[Phase 4] 3/10 Configuring IAM Service Account..."
bash "${SCRIPT_DIR}/03_setup_iam_service_account.sh" "$PROJECT_ID" "sa-pratyaksha-runtime"

echo "[Phase 4] 4/10 Configuring Secret Manager..."
bash "${SCRIPT_DIR}/04_configure_secrets.sh" "$PROJECT_ID"

echo "[Phase 5] 5/10 Provisioning Cloud SQL PostGIS..."
bash "${SCRIPT_DIR}/05_provision_cloud_sql.sh" "$PROJECT_ID" "$REGION" "pratyaksha-db" "pratyaksha_prod" "pratyaksha_app"

echo "[Phase 5] 6/10 Running PostGIS Schema Migrations..."
bash "${SCRIPT_DIR}/06_run_migrations.sh" "$PROJECT_ID" "$REGION" "pratyaksha-db" "pratyaksha_prod" "pratyaksha_app"

echo "[Phase 5] 7/10 Deploying Firestore Security Rules & Indexes..."
bash "${SCRIPT_DIR}/07_deploy_firestore_rules.sh" "$PROJECT_ID" "$REGION"

echo "[Phase 6] 8/10 Provisioning Serverless VPC Access Connector..."
bash "${SCRIPT_DIR}/08_setup_vpc_connector.sh" "$PROJECT_ID" "$REGION" "pratyaksha-vpc-conn" "10.8.0.0/28"

echo "[Phase 6] 9/10 Building & Pushing Multi-Service Docker Images..."
bash "${SCRIPT_DIR}/09_build_and_push_images.sh" "$PROJECT_ID" "$REGION" "pratyaksha-repo" "latest"

echo "[Phase 6] 10/10 Deploying Cloud Run Dual-Service Architecture..."
bash "${SCRIPT_DIR}/10_deploy_cloud_run.sh" "$PROJECT_ID" "$REGION" "pratyaksha-repo" "latest" "pratyaksha-vpc-conn" "sa-pratyaksha-runtime" "pratyaksha-db"

echo "=========================================================="
echo "PRATYAKSHA GCP Full Infrastructure Deployed Successfully!"
echo "=========================================================="
