# Phase 5 Plan: Cloud SQL PostGIS & Cloud Firestore Database Provisioning

## Goal
Implement idempotent provisioning scripts and configuration templates for Cloud SQL PostgreSQL 15 with PostGIS spatial extensions, database migration automation, and Cloud Firestore security rules deployment in `asia-south1`.

---

## Task Breakdown

### Wave 1: Cloud SQL PostGIS Provisioning & Migration Scripts
- **Task 1.1**: Create `scripts/gcp/05_provision_cloud_sql.sh` and `05_provision_cloud_sql.ps1`:
  - Provisions `pratyaksha-db` on PostgreSQL 15 (`db-custom-1-3840` in `asia-south1`).
  - Configures database flags (`pgaudit`, `pg_stat_statements`).
  - Creates database `pratyaksha` and user `pratyaksha_app`.
- **Task 1.2**: Create `scripts/gcp/06_run_migrations.sh` and `06_run_migrations.ps1`:
  - Runs `backend/database/migrations/001_init_postgis.sql` to initialize PostGIS extensions, tables, GIST indices, and seeds.
  - Verifies PostGIS version and row counts.

### Wave 2: Cloud Firestore Rules & Indexing Automation
- **Task 2.1**: Author `firestore.indexes.json`:
  - Defines composite indexes for `/action_plans`, `/anomaly_reviews`, and `/processing_jobs`.
- **Task 2.2**: Create `scripts/gcp/07_deploy_firestore_rules.sh` and `07_deploy_firestore_rules.ps1`:
  - Deploys `firestore.rules` and `firestore.indexes.json` to the Native Firestore database in `asia-south1`.

### Wave 3: Automated Test Verification
- **Task 3.1**: Implement `tests/engines/cloudSqlPostgres.test.ts`:
  - Validates Cloud SQL parameters, database flags, SQL migration script integrity, PostGIS DDL, and Firestore index configurations.
- **Task 3.2**: Execute `npm test` verifying 100% green exit code 0 across all suites.

### Wave 4: Documentation & State Transition
- **Task 4.1**: Author `VERIFICATION.md` for Phase 5.
- **Task 4.2**: Update `ROADMAP.md` and `STATE.md` marking Phase 5 ready for execution.

---

## Verification Criteria
- [ ] Cloud SQL provisioning includes PostGIS-ready PostgreSQL 15 configuration in `asia-south1`.
- [ ] Migration script contains all 9 tables, GIST spatial indexes, and 5-city seeds.
- [ ] Firestore indexes match query patterns on `ownerId` and timestamps.
- [ ] Automated tests in `tests/engines/cloudSqlPostgres.test.ts` pass with exit code 0.
