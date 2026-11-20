#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${2:-asia-south1}"
REPO_NAME="${3:-pratyaksha-repo}"
TAG="${4:-latest}"
VPC_CONNECTOR="${5:-pratyaksha-vpc-conn}"
SA_NAME="${6:-sa-pratyaksha-runtime}"
DB_INSTANCE="${7:-pratyaksha-db}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID required. Usage: ./10_deploy_cloud_run.sh <PROJECT_ID> [REGION] [REPO_NAME] [TAG] [VPC_CONNECTOR] [SA_NAME] [DB_INSTANCE]"
  exit 1
fi

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
REGISTRY_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
GEO_IMAGE="${REGISTRY_BASE}/pratyaksha-geo:${TAG}"
WEB_IMAGE="${REGISTRY_BASE}/pratyaksha-web:${TAG}"

echo "=========================================================="
echo "PRATYAKSHA Cloud Run Dual-Service Deployment"
echo "Project:       ${PROJECT_ID}"
echo "Region:        ${REGION}"
echo "VPC Connector: ${VPC_CONNECTOR}"
echo "Runtime SA:    ${SA_EMAIL}"
echo "=========================================================="

# Build secret arguments if Secret Manager secrets exist
SECRETS_ARG=()
if gcloud secrets describe DATABASE_URL --project="$PROJECT_ID" >/dev/null 2>&1; then
  if gcloud secrets describe GEE_SERVICE_ACCOUNT_KEY --project="$PROJECT_ID" >/dev/null 2>&1; then
    SECRETS_ARG=("--set-secrets=DATABASE_URL=DATABASE_URL:latest,GEE_SERVICE_ACCOUNT_KEY=GEE_SERVICE_ACCOUNT_KEY:latest")
  else
    SECRETS_ARG=("--set-secrets=DATABASE_URL=DATABASE_URL:latest")
  fi
fi

# 1. Deploy Python Geospatial Microservice (Internal Ingress, VPC Access, Cloud SQL)
echo "1/3 Deploying pratyaksha-geo-service (Python FastAPI + GEE)..."
gcloud run deploy pratyaksha-geo-service \
  --image="${GEO_IMAGE}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --service-account="${SA_EMAIL}" \
  --cpu=2 \
  --memory=2Gi \
  --port=8000 \
  --min-instances=0 \
  --max-instances=5 \
  --ingress=internal-and-cloud-load-balancing \
  --vpc-connector="${VPC_CONNECTOR}" \
  --vpc-egress=private-ranges-only \
  --add-cloudsql-instances="${PROJECT_ID}:${REGION}:${DB_INSTANCE}" \
  ${SECRETS_ARG[@]+"${SECRETS_ARG[@]}"} \
  --no-allow-unauthenticated \
  --quiet

GEO_URL=$(gcloud run services describe pratyaksha-geo-service --region="${REGION}" --project="${PROJECT_ID}" --format="value(status.url)")
echo "-> pratyaksha-geo-service deployed at: ${GEO_URL}"

# 2. Grant Invoker Permissions to Runtime Service Account
echo "2/3 Granting roles/run.invoker to ${SA_EMAIL} on pratyaksha-geo-service..."
gcloud run services add-iam-policy-binding pratyaksha-geo-service \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.invoker" \
  --quiet >/dev/null

# 3. Deploy Web Node.js/Vite Frontend Service (Public Ingress, reverse proxy to Geo URL)
echo "3/3 Deploying pratyaksha-web-service (Node.js/Express + React)..."
gcloud run deploy pratyaksha-web-service \
  --image="${WEB_IMAGE}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --service-account="${SA_EMAIL}" \
  --cpu=1 \
  --memory=512Mi \
  --port=3000 \
  --min-instances=0 \
  --max-instances=10 \
  --ingress=all \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,GEO_BACKEND_URL=${GEO_URL}" \
  --quiet

WEB_URL=$(gcloud run services describe pratyaksha-web-service --region="${REGION}" --project="${PROJECT_ID}" --format="value(status.url)")

echo "=========================================================="
echo "PRATYAKSHA Cloud Run Deployment Successful!"
echo "Web Service (Public):   ${WEB_URL}"
echo "Geo Backend (Internal): ${GEO_URL}"
echo "=========================================================="
