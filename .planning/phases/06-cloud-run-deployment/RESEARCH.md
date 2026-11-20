# Phase 6 Research: Cloud Run Dual-Service Deployment & Serverless VPC Networking

## 1. Domain Objective
Deploy PRATYAKSHA to Google Cloud Run in `asia-south1` (Mumbai) using a dual-service topology with Serverless VPC Access to Cloud SQL PostGIS, Secret Manager credential injection, and secure service-to-service IAM authentication.

---

## 2. Technical Topology & Architectural Choices

### 2.1 Dual-Service Deployment Specification
```
                 [ Public Internet Traffic ]
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │       pratyaksha-web-service              │
        │   Node.js 24 + Express 5 + React 19 SPA   │
        │   - Ingress: all (public)                 │
        │   - CPU/Mem: 1 vCPU, 512 MiB              │
        │   - Auto-scale: min 0, max 10             │
        │   - Port: 3000                            │
        └─────────────────────┬─────────────────────┘
                              │
                              │ Internal HTTP + Google IAM ID Token
                              ▼
        ┌───────────────────────────────────────────┐
        │       pratyaksha-geo-service              │
        │       Python 3.11 + FastAPI               │
        │   - Ingress: internal-and-cloud-load-     │
        │     balancing                             │
        │   - CPU/Mem: 2 vCPU, 2 GiB                │
        │   - Auto-scale: min 0, max 5              │
        │   - Port: 8000                            │
        │   - Cloud SQL Socket: pratyaksha-db       │
        │   - VPC Connector: pratyaksha-vpc-conn    │
        └───────────────────────────────────────────┘
```

### 2.2 Serverless VPC Access Connector
- **Name**: `pratyaksha-vpc-conn`
- **Region**: `asia-south1` (Mumbai)
- **Network**: `default`
- **IP Range**: `10.8.0.0/28` (dedicated unallocated RFC 1918 block)
- **Throughput**: Min 200 Mbps (2 instances), max 300 Mbps (3 instances)
- **Egress Routing**: `private-ranges-only` (ensures internet traffic routes directly while RFC 1918 database traffic routes securely across the VPC)

### 2.3 Service-to-Service IAM Security
- When `pratyaksha-web-service` proxies `/api/py/*` requests to `pratyaksha-geo-service`:
  - It queries the GCP metadata server:
    `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${GEO_SERVICE_URL}`
  - Attaches the resulting JWT to the `Authorization: Bearer <ID_TOKEN>` header.
  - The Geo service rejects unauthenticated requests with HTTP 403, preventing unauthorized access.

### 2.4 Cloud SQL Mount & Secret Manager
- `--add-cloudsql-instances=${PROJECT_ID}:asia-south1:pratyaksha-db`
- `--set-secrets=DATABASE_URL=DATABASE_URL:latest,GEE_SERVICE_ACCOUNT_KEY=GEE_SERVICE_ACCOUNT_KEY:latest`
- If secrets are unconfigured, both services transparently activate `DEMO_FALLBACK` as mandated by **ADR-02**.

---

## 3. Deliverables Checklist
1. `scripts/gcp/08_setup_vpc_connector.sh` and `08_setup_vpc_connector.ps1`
2. `scripts/gcp/09_build_and_push_images.sh` and `09_build_and_push_images.ps1`
3. `scripts/gcp/10_deploy_cloud_run.sh` and `10_deploy_cloud_run.ps1`
4. Metadata IAM token injection enhancement in `server.ts`
5. Automated test suite `tests/engines/cloudRunDeployment.test.ts`
