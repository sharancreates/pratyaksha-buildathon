#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null || echo "")}"
INSTANCE_NAME="${2:-pratyaksha-db}"
DB_NAME="${3:-pratyaksha}"
DB_USER="${4:-pratyaksha_app}"
MIGRATION_FILE="${ROOT_DIR}/backend/database/migrations/001_init_postgis.sql"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID required. Usage: ./06_run_migrations.sh <PROJECT_ID> [INSTANCE_NAME] [DB_NAME] [DB_USER]"
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: Migration file not found at ${MIGRATION_FILE}"
  exit 1
fi

echo "Running PostGIS spatial migrations against ${INSTANCE_NAME}/${DB_NAME}..."

# Execute migration using gcloud sql connect
gcloud sql connect "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --database="$DB_NAME" \
  --user="$DB_USER" \
  < "$MIGRATION_FILE"

echo "Verifying PostGIS extension and seeded municipalities..."
VERIFY_QUERY="SELECT PostGIS_Version(); SELECT count(*) AS municipal_count FROM municipalities;"
echo "$VERIFY_QUERY" | gcloud sql connect "$INSTANCE_NAME" \
  --project="$PROJECT_ID" \
  --database="$DB_NAME" \
  --user="$DB_USER" --quiet

echo "Migrations executed successfully."
