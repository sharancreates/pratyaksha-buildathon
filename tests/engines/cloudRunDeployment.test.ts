import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { getGcpIdToken, resetTokenCache, getCachedToken } from '../../src/server/utils/gcpAuth.ts';

describe('cloudRunDeployment: Serverless VPC, Dual Cloud Run Services & IAM Validation', () => {
  const rootDir = process.cwd();
  const scriptsDir = path.join(rootDir, 'scripts', 'gcp');

  test('all Phase 6 deployment and networking scripts exist', () => {
    const requiredScripts = [
      '08_setup_vpc_connector.sh',
      '08_setup_vpc_connector.ps1',
      '09_build_and_push_images.sh',
      '09_build_and_push_images.ps1',
      '10_deploy_cloud_run.sh',
      '10_deploy_cloud_run.ps1',
    ];

    for (const s of requiredScripts) {
      const p = path.join(scriptsDir, s);
      assert.ok(fs.existsSync(p), `Missing script: ${s}`);
    }
  });

  test('08_setup_vpc_connector configures Serverless VPC Connector in asia-south1 with 10.8.0.0/28', () => {
    const shContent = fs.readFileSync(path.join(scriptsDir, '08_setup_vpc_connector.sh'), 'utf-8');
    const psContent = fs.readFileSync(path.join(scriptsDir, '08_setup_vpc_connector.ps1'), 'utf-8');

    assert.ok(shContent.includes('pratyaksha-vpc-conn'), 'Must configure pratyaksha-vpc-conn');
    assert.ok(shContent.includes('asia-south1'), 'Must target asia-south1');
    assert.ok(shContent.includes('10.8.0.0/28'), 'Must allocate dedicated 10.8.0.0/28 CIDR');
    assert.ok(shContent.includes('--min-instances=2'), 'Must specify min-instances=2');
    assert.ok(shContent.includes('--max-instances=3'), 'Must specify max-instances=3');

    assert.ok(psContent.includes('pratyaksha-vpc-conn'));
    assert.ok(psContent.includes('asia-south1'));
    assert.ok(psContent.includes('10.8.0.0/28'));
    assert.ok(psContent.includes('--min-instances=2'));
    assert.ok(psContent.includes('--max-instances=3'));
  });

  test('09_build_and_push_images builds and tags both Web and Geo container images', () => {
    const shContent = fs.readFileSync(path.join(scriptsDir, '09_build_and_push_images.sh'), 'utf-8');
    const psContent = fs.readFileSync(path.join(scriptsDir, '09_build_and_push_images.ps1'), 'utf-8');

    assert.ok(shContent.includes('pratyaksha-web:${TAG}'), 'Must tag pratyaksha-web image');
    assert.ok(shContent.includes('pratyaksha-geo:${TAG}'), 'Must tag pratyaksha-geo image');
    assert.ok(shContent.includes('docker.pkg.dev'), 'Must push to Artifact Registry');
    assert.ok(shContent.includes('backend/Dockerfile'), 'Must use backend Dockerfile for geo service');

    assert.ok(psContent.includes('pratyaksha-web:$Tag'));
    assert.ok(psContent.includes('pratyaksha-geo:$Tag'));
    assert.ok(psContent.includes('docker.pkg.dev'));
  });

  test('10_deploy_cloud_run configures private Geo microservice with Cloud SQL & VPC connector', () => {
    const shContent = fs.readFileSync(path.join(scriptsDir, '10_deploy_cloud_run.sh'), 'utf-8');
    const psContent = fs.readFileSync(path.join(scriptsDir, '10_deploy_cloud_run.ps1'), 'utf-8');

    // Geo service specs
    assert.ok(shContent.includes('run deploy pratyaksha-geo-service'), 'Must deploy pratyaksha-geo-service');
    assert.ok(shContent.includes('--cpu=2'), 'Geo service must have 2 vCPU');
    assert.ok(shContent.includes('--memory=2Gi'), 'Geo service must have 2Gi memory');
    assert.ok(shContent.includes('--port=8000'), 'Geo service must expose port 8000');
    assert.ok(shContent.includes('--ingress=internal-and-cloud-load-balancing'), 'Geo service must have internal ingress');
    assert.ok(shContent.includes('--vpc-connector='), 'Geo service must attach VPC connector');
    assert.ok(shContent.includes('--vpc-egress=private-ranges-only'), 'Geo service must route private ranges through VPC');
    assert.ok(shContent.includes('--add-cloudsql-instances='), 'Geo service must mount Cloud SQL instance');
    assert.ok(shContent.includes('--no-allow-unauthenticated'), 'Geo service must require authentication');

    // PowerShell parity
    assert.ok(psContent.includes('pratyaksha-geo-service'));
    assert.ok(psContent.includes('--cpu=2'));
    assert.ok(psContent.includes('--memory=2Gi'));
    assert.ok(psContent.includes('--ingress=internal-and-cloud-load-balancing'));
  });

  test('10_deploy_cloud_run configures public Web service with reverse proxy env and IAM invoker', () => {
    const shContent = fs.readFileSync(path.join(scriptsDir, '10_deploy_cloud_run.sh'), 'utf-8');
    const psContent = fs.readFileSync(path.join(scriptsDir, '10_deploy_cloud_run.ps1'), 'utf-8');

    // Web service specs
    assert.ok(shContent.includes('run deploy pratyaksha-web-service'), 'Must deploy pratyaksha-web-service');
    assert.ok(shContent.includes('--cpu=1'), 'Web service must have 1 vCPU');
    assert.ok(shContent.includes('--memory=512Mi'), 'Web service must have 512Mi memory');
    assert.ok(shContent.includes('--port=3000'), 'Web service must expose port 3000');
    assert.ok(shContent.includes('--ingress=all'), 'Web service must accept public ingress');
    assert.ok(shContent.includes('--allow-unauthenticated'), 'Web service must allow unauthenticated access');
    assert.ok(shContent.includes('GEO_BACKEND_URL='), 'Web service must receive GEO_BACKEND_URL');
    assert.ok(shContent.includes('roles/run.invoker'), 'Must grant roles/run.invoker to runtime SA');

    // PowerShell parity
    assert.ok(psContent.includes('pratyaksha-web-service'));
    assert.ok(psContent.includes('--cpu=1'));
    assert.ok(psContent.includes('--memory=512Mi'));
    assert.ok(psContent.includes('roles/run.invoker'));
  });

  test('gcpAuth helper correctly manages IAM identity token retrieval and caching', async () => {
    resetTokenCache();
    assert.equal(getCachedToken(), null);

    // Non-HTTPS target returns null immediately (no metadata request needed)
    const localToken = await getGcpIdToken('http://localhost:8000');
    assert.equal(localToken, null);

    const emptyToken = await getGcpIdToken('');
    assert.equal(emptyToken, null);

    // Unreachable metadata server returns null gracefully (ADR-02)
    const fallbackToken = await getGcpIdToken('https://pratyaksha-geo-service-asia-south1.a.run.app', 'http://127.0.0.1:54321');
    assert.equal(fallbackToken, null);

    // Test with local mock metadata server
    const mockServer = http.createServer((req, res) => {
      const flavor = req.headers['metadata-flavor'];
      if (flavor === 'Google' && req.url?.includes('audience=')) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-gcp-id-token');
      } else {
        res.writeHead(403);
        res.end('Forbidden');
      }
    });

    await new Promise<void>((resolve) => mockServer.listen(0, '127.0.0.1', () => resolve()));
    const port = (mockServer.address() as { port: number }).port;
    const mockMetadataHost = `http://127.0.0.1:${port}`;

    try {
      resetTokenCache();
      const audience = 'https://pratyaksha-geo-service-asia-south1.a.run.app';
      const token1 = await getGcpIdToken(audience, mockMetadataHost);
      assert.equal(token1, 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-gcp-id-token');

      // Second call should return cached token without requesting server
      const cached = getCachedToken();
      assert.ok(cached !== null);
      assert.equal(cached.token, token1);
      assert.equal(cached.audience, audience);

      const token2 = await getGcpIdToken(audience, 'http://invalid-dead-host');
      assert.equal(token2, token1, 'Must return cached token');
    } finally {
      mockServer.close();
      resetTokenCache();
    }
  });

  test('server.ts integrates getGcpIdToken for reverse proxy authentication', () => {
    const serverCode = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
    assert.ok(serverCode.includes("import { getGcpIdToken } from './src/server/utils/gcpAuth.ts'"), 'server.ts must import getGcpIdToken');
    assert.ok(serverCode.includes('await getGcpIdToken(GEO_BACKEND_URL)'), 'server.ts must call getGcpIdToken for GEO_BACKEND_URL');
    assert.ok(serverCode.includes('Authorization'), 'server.ts must attach Authorization header with Bearer token');
  });
});
