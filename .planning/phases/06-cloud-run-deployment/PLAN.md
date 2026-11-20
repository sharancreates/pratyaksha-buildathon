# Phase 6 Plan: Cloud Run Dual-Service Deployment & Serverless VPC Networking

## Goal
Implement automated scripts for Serverless VPC Access connector provisioning, container image build/push to Artifact Registry, dual Cloud Run service deployments in `asia-south1`, and secure service-to-service IAM token resolution in `server.ts`.

---

## Task Breakdown

### Wave 1: Serverless VPC Access & Image Build Pipeline
- **Task 1.1**: Create `scripts/gcp/08_setup_vpc_connector.sh` and `08_setup_vpc_connector.ps1`:
  - Idempotently creates `pratyaksha-vpc-conn` in `asia-south1` with range `10.8.0.0/28`.
- **Task 1.2**: Create `scripts/gcp/09_build_and_push_images.sh` and `09_build_and_push_images.ps1`:
  - Builds and tags `pratyaksha-web-service` and `pratyaksha-geo-service` images and pushes to Artifact Registry.

### Wave 2: Cloud Run Deployment & Service-to-Service IAM
- **Task 2.1**: Create `scripts/gcp/10_deploy_cloud_run.sh` and `10_deploy_cloud_run.ps1`:
  - Deploys `pratyaksha-geo-service` (2 vCPU, 2 GiB, internal ingress, VPC connector, secrets).
  - Retrieves private service URL.
  - Deploys `pratyaksha-web-service` (1 vCPU, 512 MiB, public ingress, `GEO_BACKEND_URL`).
- **Task 2.2**: Update `server.ts` reverse proxy to acquire and inject Google IAM ID tokens when communicating with Cloud Run services.

### Wave 3: Automated Validation Test Suite
- **Task 3.1**: Implement `tests/engines/cloudRunDeployment.test.ts`:
  - Validates VPC connector parameters, Cloud Run resource specifications, ingress settings, and IAM metadata token handler.
- **Task 3.2**: Execute `npm test` verifying 100% green execution across all test suites.

### Wave 4: Documentation & State Transition
- **Task 4.1**: Author `VERIFICATION.md` for Phase 6.
- **Task 4.2**: Update `ROADMAP.md` and `STATE.md` marking Phase 6 ready for execution.

---

## Verification Criteria
- [ ] Serverless VPC connector configured for `asia-south1` with `10.8.0.0/28`.
- [ ] Geo service configured with 2 vCPU, 2 GiB, internal ingress, and Cloud SQL bindings.
- [ ] Web service configured with 1 vCPU, 512 MiB, public ingress, and reverse proxy forwarding.
- [ ] Automated tests in `tests/engines/cloudRunDeployment.test.ts` pass with exit code 0.
