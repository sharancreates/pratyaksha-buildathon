#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${2:-asia-south1}"
CONNECTOR_NAME="${3:-pratyaksha-vpc-conn}"
RANGE="${4:-10.8.0.0/28}"
NETWORK="${5:-default}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID required. Usage: ./08_setup_vpc_connector.sh <PROJECT_ID> [REGION] [CONNECTOR_NAME] [RANGE] [NETWORK]"
  exit 1
fi

echo "Configuring Serverless VPC Access connector '${CONNECTOR_NAME}' in ${REGION}..."

if gcloud compute networks vpc-access connectors describe "$CONNECTOR_NAME" --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "VPC connector '${CONNECTOR_NAME}' already exists."
else
  echo "Creating Serverless VPC Access connector '${CONNECTOR_NAME}'..."
  gcloud compute networks vpc-access connectors create "$CONNECTOR_NAME" \
    --region="$REGION" \
    --range="$RANGE" \
    --network="$NETWORK" \
    --project="$PROJECT_ID" \
    --min-instances=2 \
    --max-instances=3 \
    --machine-type=e2-micro \
    --quiet
  echo "VPC connector created successfully."
fi
