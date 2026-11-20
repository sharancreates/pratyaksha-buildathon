#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID required. Usage: ./04_configure_secrets.sh <PROJECT_ID>"
  exit 1
fi

echo "Provisioning Google Secret Manager slots for project: ${PROJECT_ID}..."

SECRETS=(
  "DATABASE_URL"
  "GEE_SERVICE_ACCOUNT_KEY"
  "FIREBASE_CONFIG"
)

for secret in "${SECRETS[@]}"; do
  if gcloud secrets describe "$secret" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Secret '${secret}' already exists."
  else
    echo "-> Creating secret slot '${secret}'..."
    gcloud secrets create "$secret" \
      --project="$PROJECT_ID" \
      --replication-policy="automatic"
  fi
done

echo "All Secret Manager slots initialized."
