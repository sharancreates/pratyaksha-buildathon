#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${2:-asia-south1}"
INSTANCE_NAME="${3:-pratyaksha-db}"
DB_NAME="${4:-pratyaksha}"
DB_USER="${5:-pratyaksha_app}"
DB_PASS="${6:-$(openssl rand -base64 18 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c 16 || echo "PratyakshaDB2026Pass")}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID required. Usage: ./05_provision_cloud_sql.sh <PROJECT_ID> [REGION] [INSTANCE_NAME] [DB_NAME] [DB_USER] [DB_PASS]"
  exit 1
fi

echo "Configuring Cloud SQL instance '${INSTANCE_NAME}' in ${REGION} (Project: ${PROJECT_ID})..."

if gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Cloud SQL instance '${INSTANCE_NAME}' already exists."
else
  echo "Creating PostgreSQL 15 instance '${INSTANCE_NAME}'..."
  gcloud sql instances create "$INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    --database-version="POSTGRES_15" \
    --tier="db-custom-1-3840" \
    --region="$REGION" \
    --storage-size=20GB \
    --storage-type=SSD \
    --storage-auto-increase \
    --backup-start-time="02:00" \
    --database-flags="cloudsql.enable_pgaudit=on,shared_preload_libraries=pg_stat_statements" \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=03 \
    --quiet
  echo "Instance created."
fi

echo "Ensuring database '${DB_NAME}' exists..."
if gcloud sql databases describe "$DB_NAME" --instance="$INSTANCE_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Database '${DB_NAME}' exists."
else
  gcloud sql databases create "$DB_NAME" --instance="$INSTANCE_NAME" --project="$PROJECT_ID"
  echo "Database '${DB_NAME}' created."
fi

echo "Ensuring user '${DB_USER}' exists..."
if gcloud sql users list --instance="$INSTANCE_NAME" --project="$PROJECT_ID" --format="value(name)" | grep -w "$DB_USER" >/dev/null 2>&1; then
  echo "User '${DB_USER}' exists."
else
  gcloud sql users create "$DB_USER" \
    --instance="$INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    --password="$DB_PASS"
  echo "User '${DB_USER}' created."
fi

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
printf "%s" "$DATABASE_URL" | gcloud secrets versions add DATABASE_URL --data-file=- --project="$PROJECT_ID" 2>/dev/null || true
echo "DATABASE_URL secret updated in Secret Manager."
