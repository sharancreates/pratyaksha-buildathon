import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('cloudBuildCiCd: Google Cloud Build CI/CD Pipeline & Operations Runbook Validation', () => {
  const rootDir = process.cwd();
  const cloudbuildPath = path.join(rootDir, 'cloudbuild.yaml');
  const smokeShPath = path.join(rootDir, 'scripts', 'gcp', '11_smoke_test.sh');
  const smokePs1Path = path.join(rootDir, 'scripts', 'gcp', '11_smoke_test.ps1');
  const runbookPath = path.join(rootDir, 'docs', 'MUNICIPAL_OPERATIONS_RUNBOOK.md');

  test('cloudbuild.yaml exists and contains all required pipeline stages', () => {
    assert.ok(fs.existsSync(cloudbuildPath), 'cloudbuild.yaml must exist');
    const content = fs.readFileSync(cloudbuildPath, 'utf-8');

    // Expected build steps
    const expectedStepIds = [
      'unit-tests',
      'build-web',
      'build-geo',
      'push-web',
      'push-geo',
      'deploy-geo',
      'deploy-web',
      'smoke-test',
    ];

    for (const stepId of expectedStepIds) {
      assert.ok(
        content.includes(`id: '${stepId}'`) || content.includes(`id: "${stepId}"`),
        `Missing Cloud Build step: ${stepId}`
      );
    }

    // Step 1 must run npm test in node:22-alpine
    assert.ok(content.includes('node:22-alpine'), 'Step 1 must run in node:22-alpine');
    assert.ok(content.includes("args: ['test']"), 'Step 1 must invoke npm test');

    // Verify substitutions
    assert.ok(content.includes('_REGION: \'asia-south1\''), 'Substitutions must set _REGION to asia-south1');
    assert.ok(content.includes('_REPO_NAME: \'pratyaksha-repo\''), 'Substitutions must set _REPO_NAME');
    assert.ok(content.includes('_VPC_CONNECTOR: \'pratyaksha-vpc-conn\''), 'Substitutions must set _VPC_CONNECTOR');
    assert.ok(content.includes('_DB_INSTANCE: \'pratyaksha-db\''), 'Substitutions must set _DB_INSTANCE');
    assert.ok(content.includes('_SA_NAME: \'sa-pratyaksha-runtime\''), 'Substitutions must set _SA_NAME');

    // Verify options and timeout
    assert.ok(content.includes('timeout: \'1200s\''), 'Must configure 1200s timeout');
    assert.ok(content.includes('logging: CLOUD_LOGGING_ONLY'), 'Must configure CLOUD_LOGGING_ONLY');
  });

  test('scripts/gcp/11_smoke_test.sh and .ps1 exist and cover 6 core municipal endpoints', () => {
    assert.ok(fs.existsSync(smokeShPath), '11_smoke_test.sh must exist');
    assert.ok(fs.existsSync(smokePs1Path), '11_smoke_test.ps1 must exist');

    const sh = fs.readFileSync(smokeShPath, 'utf-8');
    const ps = fs.readFileSync(smokePs1Path, 'utf-8');

    const expectedEndpoints = [
      '/api/health',
      '/api/system/status',
      '/api/dashboard/overview?municipality=ahmedabad',
      '/api/ml/anomalies?municipality=ahmedabad',
      '/api/forecast/history?municipality=mumbai',
      '/api/analytics/heat-island?municipality=delhi',
    ];

    for (const ep of expectedEndpoints) {
      assert.ok(sh.includes(ep), `11_smoke_test.sh must probe ${ep}`);
      assert.ok(ps.includes(ep), `11_smoke_test.ps1 must probe ${ep}`);
    }

    // Must handle exit codes for CI/CD gates
    assert.ok(sh.includes('exit 0'), 'Bash script must exit 0 on success');
    assert.ok(sh.includes('exit 1'), 'Bash script must exit 1 on failure');
    assert.ok(ps.includes('exit 0'), 'PowerShell script must exit 0 on success');
    assert.ok(ps.includes('exit 1'), 'PowerShell script must exit 1 on failure');
  });

  test('docs/MUNICIPAL_OPERATIONS_RUNBOOK.md establishes comprehensive governance & operational procedures', () => {
    assert.ok(fs.existsSync(runbookPath), 'MUNICIPAL_OPERATIONS_RUNBOOK.md must exist');
    const runbook = fs.readFileSync(runbookPath, 'utf-8');

    // Section 1: Regional sovereignty & Indian metros
    assert.ok(runbook.includes('asia-south1'), 'Must state asia-south1 Mumbai region');
    assert.ok(runbook.includes('Ahmedabad'), 'Must cover Ahmedabad');
    assert.ok(runbook.includes('Delhi'), 'Must cover Delhi');
    assert.ok(runbook.includes('Mumbai'), 'Must cover Mumbai');
    assert.ok(runbook.includes('Bengaluru'), 'Must cover Bengaluru');
    assert.ok(runbook.includes('Chennai'), 'Must cover Chennai');

    // Section 2: Production SLOs
    assert.ok(runbook.includes('99.9%'), 'Must specify 99.9% availability SLO');
    assert.ok(runbook.includes('250ms'), 'Must specify latency SLO');

    // Section 3: Logging & inspection
    assert.ok(runbook.includes('gcloud logging tail'), 'Must provide log streaming commands');

    // Section 4: Auto-scaling
    assert.ok(runbook.includes('min-instances'), 'Must detail min-instances controls');
    assert.ok(runbook.includes('max-instances'), 'Must detail max-instances controls');

    // Section 5: Secret rotation
    assert.ok(runbook.includes('GEE_SERVICE_ACCOUNT_KEY'), 'Must provide GEE key rotation instructions');
    assert.ok(runbook.includes('DATABASE_URL'), 'Must provide DB credential rotation instructions');

    // Section 6: Emergency rollback
    assert.ok(runbook.includes('gcloud run services update-traffic'), 'Must document update-traffic rollback commands');

    // Section 7: ADR-02 Deterministic Demo Fallback
    assert.ok(runbook.includes('ADR-02'), 'Must document ADR-02 fallback mechanism');
    assert.ok(runbook.includes('DEMO_FALLBACK'), 'Must document DEMO_FALLBACK mode');
  });
});
