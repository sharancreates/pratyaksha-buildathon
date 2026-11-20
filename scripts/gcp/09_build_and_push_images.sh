#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${2:-asia-south1}"
REPO_NAME="${3:-pratyaksha-repo}"
TAG="${4:-latest}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID required. Usage: ./09_build_and_push_images.sh <PROJECT_ID> [REGION] [REPO_NAME] [TAG]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

REGISTRY_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
WEB_IMAGE="${REGISTRY_BASE}/pratyaksha-web:${TAG}"
GEO_IMAGE="${REGISTRY_BASE}/pratyaksha-geo:${TAG}"

echo "=========================================================="
echo "PRATYAKSHA Container Build & Push Pipeline"
echo "Project:  ${PROJECT_ID}"
echo "Region:   ${REGION}"
echo "Registry: ${REGISTRY_BASE}"
echo "Tag:      ${TAG}"
echo "=========================================================="

# Authenticate Docker with Google Artifact Registry
echo "Authenticating Docker for ${REGION}-docker.pkg.dev..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "1/2 Building & Pushing PRATYAKSHA Web Service..."
docker build -t "${WEB_IMAGE}" -f "${ROOT_DIR}/Dockerfile" "${ROOT_DIR}"
docker push "${WEB_IMAGE}"
echo "-> Web image pushed successfully: ${WEB_IMAGE}"

echo "2/2 Building & Pushing PRATYAKSHA Geospatial Backend Service..."
docker build -t "${GEO_IMAGE}" -f "${ROOT_DIR}/backend/Dockerfile" "${ROOT_DIR}/backend"
docker push "${GEO_IMAGE}"
echo "-> Geo backend image pushed successfully: ${GEO_IMAGE}"

echo "=========================================================="
echo "Container images built and pushed successfully to Artifact Registry!"
echo "Web: ${WEB_IMAGE}"
echo "Geo: ${GEO_IMAGE}"
echo "=========================================================="
