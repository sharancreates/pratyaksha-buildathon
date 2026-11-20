#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"
SA_NAME="${2:-sa-pratyaksha-runtime}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID required. Usage: ./03_setup_iam_service_account.sh <PROJECT_ID> [SA_NAME]"
  exit 1
fi

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Configuring runtime service account: ${SA_EMAIL}..."

if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Service account ${SA_EMAIL} already exists."
else
  echo "Creating service account ${SA_NAME}..."
  gcloud iam service-accounts create "$SA_NAME" \
    --project="$PROJECT_ID" \
    --display-name="PRATYAKSHA Production Runtime Service Account" \
    --description="Minimal privilege identity for Cloud Run web and geospatial services"
fi

ROLES=(
  "roles/secretmanager.secretAccessor"
  "roles/cloudsql.client"
  "roles/datastore.user"
  "roles/run.invoker"
)

echo "Binding least-privilege IAM roles to ${SA_EMAIL}..."
for role in "${ROLES[@]}"; do
  echo "-> Binding ${role}..."
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$role" \
    --condition=None \
    --quiet >/dev/null
done

echo "All IAM roles bound successfully to ${SA_EMAIL}."
