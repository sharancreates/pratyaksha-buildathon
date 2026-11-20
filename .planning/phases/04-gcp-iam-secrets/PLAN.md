# Phase 4 Plan: GCP IAM Security, Artifact Registry & Secret Manager Architecture

## Goal
Implement automated, idempotent infrastructure-as-code scripts and templates for GCP API enablement, Artifact Registry repository setup, runtime Service Account creation with least-privilege IAM bindings, and Secret Manager schemas for the `asia-south1` deployment.

---

## Task Breakdown

### Wave 1: Modular GCP IaC Automation Scripts
- **Task 1.1**: Create `scripts/gcp/01_enable_apis.sh` and `01_enable_apis.ps1`:
  - Enables all 8 required APIs (`run`, `artifactregistry`, `sqladmin`, `secretmanager`, `earthengine`, `iam`, `vpcaccess`, `cloudbuild`).
- **Task 1.2**: Create `scripts/gcp/02_create_artifact_registry.sh` and `02_create_artifact_registry.ps1`:
  - Idempotently creates `pratyaksha-repo` in `asia-south1`.
- **Task 1.3**: Create `scripts/gcp/03_setup_iam_service_account.sh` and `03_setup_iam_service_account.ps1`:
  - Creates `sa-pratyaksha-runtime` and assigns least-privilege roles (`secretmanager.secretAccessor`, `cloudsql.client`, `datastore.user`, `run.invoker`).
- **Task 1.4**: Create `scripts/gcp/04_configure_secrets.sh` and `04_configure_secrets.ps1`:
  - Idempotently provisions secret slots for `DATABASE_URL`, `GEE_SERVICE_ACCOUNT_KEY`, and `FIREBASE_CONFIG`.
- **Task 1.5**: Create master runner scripts `scripts/gcp/setup_all.sh` and `setup_all.ps1`.

### Wave 2: Secret Schemas & Configuration Templates
- **Task 2.1**: Author `scripts/gcp/templates/DATABASE_URL.template.env`:
  - Cloud SQL Unix socket and VPC private IP formats.
- **Task 2.2**: Author `scripts/gcp/templates/GEE_SERVICE_ACCOUNT_KEY.template.json`:
  - Standard Google Service Account key structure with placeholder keys.
- **Task 2.3**: Author `scripts/gcp/templates/FIREBASE_CONFIG.template.json`:
  - Firebase app and project parameters.

### Wave 3: Automated Validation Test Suite
- **Task 3.1**: Implement `tests/engines/gcpIaC.test.ts`:
  - Validates script presence, executable flags, API list completeness, role definitions, and template JSON formats.
- **Task 3.2**: Run `npm test` verifying 100% green execution across all test suites.

### Wave 4: Documentation & State Update
- **Task 4.1**: Create `VERIFICATION.md` for Phase 4.
- **Task 4.2**: Update `ROADMAP.md` and `STATE.md` marking Phase 4 ready for execution.

---

## Verification Criteria
- [ ] Scripts are idempotent (can run multiple times without error).
- [ ] Covers all 8 required GCP APIs.
- [ ] Follows least-privilege IAM principle with 0 over-permissioned roles.
- [ ] Secret templates prevent accidental secret leaks.
- [ ] Automated tests in `tests/engines/gcpIaC.test.ts` pass with exit code 0.
