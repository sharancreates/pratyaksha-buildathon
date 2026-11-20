import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Containerization Specification: Root Dockerfile & .dockerignore', () => {
  const dockerfilePath = path.join(ROOT_DIR, 'Dockerfile');
  assert.ok(fs.existsSync(dockerfilePath), 'Root Dockerfile must exist');

  const content = fs.readFileSync(dockerfilePath, 'utf-8');

  // Multi-stage builder & runner
  assert.match(content, /FROM node:24-alpine AS builder/, 'Builder stage must use node:24-alpine');
  assert.match(content, /RUN npm run build/, 'Builder stage must execute npm run build');
  assert.match(content, /FROM node:24-alpine AS runner/, 'Runner stage must use node:24-alpine');
  assert.match(content, /npm install --omit=dev/, 'Runner stage must install production-only dependencies');

  // Static assets & code copy
  assert.match(content, /COPY --from=builder \/app\/dist \.\/dist/, 'Runner must copy compiled dist from builder');
  assert.match(content, /COPY server\.ts \.\//, 'Runner must copy server.ts');

  // Security & Healthcheck
  assert.match(content, /USER node/, 'Runner must switch to unprivileged node user');
  assert.match(content, /EXPOSE 3000/, 'Runner must expose port 3000');
  assert.match(content, /HEALTHCHECK[\s\S]*\/api\/health/, 'Runner must declare health check on /api/health');

  // .dockerignore check
  const dockerignorePath = path.join(ROOT_DIR, '.dockerignore');
  assert.ok(fs.existsSync(dockerignorePath), 'Root .dockerignore must exist');
  const ignoreContent = fs.readFileSync(dockerignorePath, 'utf-8');
  assert.match(ignoreContent, /node_modules/, '.dockerignore must exclude node_modules');
  assert.match(ignoreContent, /dist/, '.dockerignore must exclude dist');
  assert.match(ignoreContent, /\.git/, '.dockerignore must exclude .git');
  assert.match(ignoreContent, /\.env\*/, '.dockerignore must exclude environment secrets');
});

test('Containerization Specification: backend/Dockerfile & .dockerignore', () => {
  const backendDockerfilePath = path.join(ROOT_DIR, 'backend', 'Dockerfile');
  assert.ok(fs.existsSync(backendDockerfilePath), 'backend/Dockerfile must exist');

  const content = fs.readFileSync(backendDockerfilePath, 'utf-8');

  // Base OS and dependencies
  assert.match(content, /python:3\.11-slim-bookworm/, 'Backend must use Debian Bookworm Python 3.11 for GDAL/C-lib compatibility');
  assert.match(content, /apt-get install[\s\S]*gdal-bin/, 'Backend must install system GDAL packages');

  // PyTorch CPU bloat mitigation
  assert.match(content, /download\.pytorch\.org\/whl\/cpu/, 'Backend must install PyTorch CPU wheel to avoid 2.5GB CUDA bloat');

  // Non-root security
  assert.match(content, /useradd[\s\S]*appuser/, 'Backend must create non-root appuser');
  assert.match(content, /USER appuser/, 'Backend must run as appuser');

  // Port and healthcheck
  assert.match(content, /EXPOSE 8000/, 'Backend must expose port 8000');
  assert.match(content, /HEALTHCHECK[\s\S]*\/api\/health/, 'Backend must declare health check on /api/health');
  assert.match(content, /DEMO_MODE=true/, 'Backend must default to DEMO_MODE=true for synthetic resilience');

  // backend/.dockerignore check
  const backendIgnorePath = path.join(ROOT_DIR, 'backend', '.dockerignore');
  assert.ok(fs.existsSync(backendIgnorePath), 'backend/.dockerignore must exist');
  const ignoreContent = fs.readFileSync(backendIgnorePath, 'utf-8');
  assert.match(ignoreContent, /__pycache__/, 'backend/.dockerignore must exclude __pycache__');
  assert.match(ignoreContent, /\.venv/, 'backend/.dockerignore must exclude virtual environments');
});

test('Containerization Specification: docker-compose.yml Orchestration', () => {
  const composePath = path.join(ROOT_DIR, 'docker-compose.yml');
  assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist');

  const content = fs.readFileSync(composePath, 'utf-8');

  // Services defined
  assert.match(content, /db:/, 'Compose must define db service');
  assert.match(content, /backend:/, 'Compose must define backend service');
  assert.match(content, /web:/, 'Compose must define web service');

  // PostGIS image and SQL init mount
  assert.match(content, /postgis\/postgis:15-3\.4-alpine/, 'Database must use postgis/postgis:15-3.4-alpine');
  assert.match(content, /001_init_postgis\.sql:\/docker-entrypoint-initdb\.d\/001_init_postgis\.sql:ro/, 'Database must mount 001_init_postgis.sql');
  assert.match(content, /pg_isready -U pratyaksha -d pratyaksha/, 'Database must declare pg_isready healthcheck');

  // Dependencies and internal service URL
  assert.match(content, /condition: service_healthy/, 'Services must use condition: service_healthy');
  assert.match(content, /PYTHON_SERVICE_URL: http:\/\/backend:8000/, 'Web BFF must configure internal PYTHON_SERVICE_URL');

  // Shared network and volume
  assert.match(content, /networks:\s+pratyaksha-network:/, 'Compose must configure pratyaksha-network');
  assert.match(content, /volumes:\s+postgis_data:/, 'Compose must declare postgis_data volume');
});

test('Web BFF Reverse Proxy & Fallback Routing in server.ts', () => {
  const serverPath = path.join(ROOT_DIR, 'server.ts');
  const content = fs.readFileSync(serverPath, 'utf-8');

  assert.match(content, /PYTHON_SERVICE_URL/, 'server.ts must define PYTHON_SERVICE_URL');
  assert.match(content, /app\.use\('\/api\/py'/, 'server.ts must declare /api/py reverse proxy route');
  assert.match(content, /DEMO_SYNTHETIC_ACTIVE/, 'server.ts must handle backend unreachability with synthetic fallback');
  assert.match(content, /pythonBackend:/, 'server.ts /api/health must report pythonBackend connectivity');
});
