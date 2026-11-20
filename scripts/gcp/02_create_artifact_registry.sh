#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${2:-asia-south1}"
REPO_NAME="${3:-pratyaksha-repo}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID required. Usage: ./02_create_artifact_registry.sh <PROJECT_ID> [REGION] [REPO_NAME]"
  exit 1
fi

echo "Configuring Artifact Registry repository '${REPO_NAME}' in ${REGION} (Project: ${PROJECT_ID})..."

if gcloud artifacts repositories describe "$REPO_NAME" --project="$PROJECT_ID" --location="$REGION" >/dev/null 2>&1; then
  echo "Repository '${REPO_NAME}' already exists in ${REGION}."
else
  echo "Creating Docker repository '${REPO_NAME}'..."
  gcloud artifacts repositories create "$REPO_NAME" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --repository-format=docker \
    --description="PRATYAKSHA Docker images for Cloud Run services"
  echo "Repository created successfully."
fi

echo "Configuring docker authentication for ${REGION}-docker.pkg.dev..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
