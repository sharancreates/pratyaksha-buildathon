import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('containerConfig: Multi-Service Docker & Compose Validation', () => {
  const rootDir = process.cwd();

  test('root Dockerfile specifies multi-stage Node 24 build for Web BFF', () => {
    const dockerfilePath = path.join(rootDir, 'Dockerfile');
    assert.ok(fs.existsSync(dockerfilePath), 'Root Dockerfile must exist');

    const content = fs.readFileSync(dockerfilePath, 'utf-8');
    assert.ok(content.includes('FROM node:24-alpine AS builder'), 'Must use node:24-alpine for builder stage');
    assert.ok(content.includes('FROM node:24-alpine AS runner'), 'Must use node:24-alpine for runner stage');
    assert.ok(content.includes('EXPOSE 3000'), 'Must expose port 3000');
    assert.ok(content.includes('HEALTHCHECK'), 'Must include container healthcheck');
    assert.ok(content.includes('npm run build'), 'Must compile Vite bundle in builder stage');
    assert.ok(content.includes('--from=builder /app/dist ./dist'), 'Must copy dist from builder stage');
  });

  test('backend/Dockerfile specifies Python 3.11 Slim Bookworm build for GIS Engine', () => {
    const dockerfilePath = path.join(rootDir, 'backend', 'Dockerfile');
    assert.ok(fs.existsSync(dockerfilePath), 'backend/Dockerfile must exist');

    const content = fs.readFileSync(dockerfilePath, 'utf-8');
    assert.ok(content.includes('FROM python:3.11-slim-bookworm'), 'Must use python:3.11-slim-bookworm');
    assert.ok(content.includes('EXPOSE 8000'), 'Must expose port 8000');
    assert.ok(content.includes('requirements.txt'), 'Must copy requirements.txt');
    assert.ok(content.includes('HEALTHCHECK'), 'Must define healthcheck');
    assert.ok(content.includes('uvicorn'), 'Must execute uvicorn backend.main:app');
  });

  test('.dockerignore and backend/.dockerignore exclude build artifacts & credentials', () => {
    const rootIgnore = fs.readFileSync(path.join(rootDir, '.dockerignore'), 'utf-8');
    assert.ok(rootIgnore.includes('node_modules'), 'Root .dockerignore must exclude node_modules');
    assert.ok(rootIgnore.includes('.git'), 'Root .dockerignore must exclude .git');
    assert.ok(rootIgnore.includes('.env'), 'Root .dockerignore must exclude .env');

    const backendIgnore = fs.readFileSync(path.join(rootDir, 'backend', '.dockerignore'), 'utf-8');
    assert.ok(backendIgnore.includes('__pycache__'), 'backend/.dockerignore must exclude __pycache__');
    assert.ok(backendIgnore.includes('.venv'), 'backend/.dockerignore must exclude .venv');
  });

  test('docker-compose.yml defines web, backend, and postgis services', () => {
    const composePath = path.join(rootDir, 'docker-compose.yml');
    assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist');

    const content = fs.readFileSync(composePath, 'utf-8');
    assert.ok(content.includes('web:'), 'Must configure web service');
    assert.ok(content.includes('backend:'), 'Must configure backend service');
    assert.ok(content.includes('db:'), 'Must configure db service');
    assert.ok(content.includes('3000:3000'), 'Must map port 3000');
    assert.ok(content.includes('8000:8000'), 'Must map port 8000');
    assert.ok(content.includes('5432:5432'), 'Must map port 5432');
    assert.ok(content.includes('postgis/postgis:15-3.4'), 'Must use official PostGIS 15 image');
    assert.ok(content.includes('001_init_postgis.sql') || content.includes('migrations:'), 'Must mount migration script');
  });
});
