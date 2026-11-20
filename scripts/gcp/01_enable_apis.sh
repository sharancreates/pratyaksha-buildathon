#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"
if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID not set and cannot be inferred from gcloud config."
  echo "Usage: ./01_enable_apis.sh <PROJECT_ID>"
  exit 1
fi

echo "Enabling required Google Cloud APIs for project: ${PROJECT_ID}..."

APIS=(
  "run.googleapis.com"
  "artifactregistry.googleapis.com"
  "sqladmin.googleapis.com"
  "secretmanager.googleapis.com"
  "earthengine.googleapis.com"
  "iam.googleapis.com"
  "vpcaccess.googleapis.com"
  "cloudbuild.googleapis.com"
)

for api in "${APIS[@]}"; do
  echo "-> Enabling ${api}..."
  gcloud services enable "$api" --project="$PROJECT_ID"
done

echo "All 8 required GCP APIs enabled successfully."
