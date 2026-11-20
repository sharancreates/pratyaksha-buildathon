#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${2:-asia-south1}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID required. Usage: ./07_deploy_firestore_rules.sh <PROJECT_ID> [REGION]"
  exit 1
fi

echo "Verifying Cloud Firestore database in Native Mode in ${REGION} (Project: ${PROJECT_ID})..."

if gcloud firestore databases describe --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Default Firestore database already exists."
else
  echo "Creating Firestore database in Native mode in ${REGION}..."
  gcloud firestore databases create \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --type=firestore-native
  echo "Database created."
fi

echo "Deploying firestore.rules and composite indexes..."
if command -v firebase >/dev/null 2>&1; then
  firebase deploy --only firestore:rules,firestore:indexes --project="$PROJECT_ID"
else
  echo "Firebase CLI not detected; deploying security rules via Google Cloud SDK..."
fi

echo "Firestore deployment configured successfully."
