# Phase 4 Research: GCP IAM Security, Artifact Registry & Secret Manager Architecture

## 1. Domain Objective
Establish the foundational Google Cloud Platform security, container registry, and secrets infrastructure in `asia-south1` (Mumbai) to support the dual Cloud Run serverless services (`pratyaksha-web-service` and `pratyaksha-geo-service`), Cloud SQL PostGIS, and Cloud Firestore.

---

## 2. Technical Decisions & Service Architectures

### 2.1 Required Google Cloud APIs
To operate serverless containerized services with spatial databases and secret management, the following APIs must be activated:
| API Service Identifier | Purpose |
|-----------------------|---------|
| `run.googleapis.com` | Cloud Run serverless container runtime |
| `artifactregistry.googleapis.com` | OCI-compliant container registry for Docker images |
| `sqladmin.googleapis.com` | Cloud SQL PostgreSQL + PostGIS management |
| `secretmanager.googleapis.com` | Dynamic credential storage and injection |
| `earthengine.googleapis.com` | Google Earth Engine satellite data catalog |
| `iam.googleapis.com` | Identity & Access Management and service account keys |
| `vpcaccess.googleapis.com` | Serverless VPC Access for private database networking |
| `cloudbuild.googleapis.com` | Automated CI/CD build and deploy pipeline |

### 2.2 Google Artifact Registry Setup
- **Repository Name**: `pratyaksha-repo`
- **Format**: `docker` (OCI Standard)
- **Region**: `asia-south1` (Mumbai)
- **Image URL Pattern**:
  - Web BFF: `asia-south1-docker.pkg.dev/${PROJECT_ID}/pratyaksha-repo/pratyaksha-web-service:${TAG}`
  - Python Geo: `asia-south1-docker.pkg.dev/${PROJECT_ID}/pratyaksha-repo/pratyaksha-geo-service:${TAG}`

### 2.3 IAM Least Privilege Principle & Runtime Service Account
In accordance with **ADR-07 (Secret Manager & IAM Least Privilege with Synthetic Fallback)**, runtime containers must never run with owner/editor privileges or use hardcoded developer keys.
- **Dedicated Service Account**: `sa-pratyaksha-runtime@${PROJECT_ID}.iam.gserviceaccount.com`
- **Role Bindings**:
  1. `roles/secretmanager.secretAccessor`: Allows Cloud Run to mount/access secrets at runtime.
  2. `roles/cloudsql.client`: Authorizes secure Unix socket connections to Cloud SQL instances.
  3. `roles/datastore.user`: Grants read/write permissions to Cloud Firestore collections (`/users`, `/action_plans`, `/anomaly_reviews`, `/processing_jobs`).
  4. `roles/run.invoker`: Permits the Web BFF service account to invoke internal endpoints on the Python GIS Cloud Run service.

### 2.4 Google Secret Manager Schema & Templates
The application requires 3 core secrets configured with semantic versioning:
1. **`DATABASE_URL`**:
   - Format: `postgresql://pratyaksha_app:<PASSWORD>@/<DB_NAME>?host=/cloudsql/<PROJECT_ID>:asia-south1:pratyaksha-db` (or private IP equivalent).
2. **`GEE_SERVICE_ACCOUNT_KEY`**:
   - Format: JSON key file format holding `client_email`, `private_key`, `project_id`.
3. **`FIREBASE_CONFIG`**:
   - Format: JSON containing `projectId`, `apiKey`, `authDomain`, `appId`.

### 2.5 Multi-Platform Idempotent Scripting
To accommodate developers on Linux/macOS (`bash`) and Windows (`powershell`), provide modular, idempotent scripts with zero-failure execution when resources already exist.
