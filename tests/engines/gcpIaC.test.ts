import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('gcpIaC: GCP IAM, Artifact Registry & Secrets Infrastructure Validation', () => {
  const rootDir = process.cwd();
  const scriptsDir = path.join(rootDir, 'scripts', 'gcp');
  const templatesDir = path.join(scriptsDir, 'templates');

  test('all bash and powershell IaC scripts exist', () => {
    const requiredScripts = [
      '01_enable_apis.sh',
      '01_enable_apis.ps1',
      '02_create_artifact_registry.sh',
      '02_create_artifact_registry.ps1',
      '03_setup_iam_service_account.sh',
      '03_setup_iam_service_account.ps1',
      '04_configure_secrets.sh',
      '04_configure_secrets.ps1',
      'setup_all.sh',
      'setup_all.ps1',
    ];

    for (const s of requiredScripts) {
      const p = path.join(scriptsDir, s);
      assert.ok(fs.existsSync(p), `Missing script: ${s}`);
    }
  });

  test('01_enable_apis configures all 8 required GCP services', () => {
    const shContent = fs.readFileSync(path.join(scriptsDir, '01_enable_apis.sh'), 'utf-8');
    const psContent = fs.readFileSync(path.join(scriptsDir, '01_enable_apis.ps1'), 'utf-8');

    const expectedApis = [
      'run.googleapis.com',
      'artifactregistry.googleapis.com',
      'sqladmin.googleapis.com',
      'secretmanager.googleapis.com',
      'earthengine.googleapis.com',
      'iam.googleapis.com',
      'vpcaccess.googleapis.com',
      'cloudbuild.googleapis.com',
    ];

    for (const api of expectedApis) {
      assert.ok(shContent.includes(api), `01_enable_apis.sh missing ${api}`);
      assert.ok(psContent.includes(api), `01_enable_apis.ps1 missing ${api}`);
    }
  });

  test('02_create_artifact_registry specifies docker format in asia-south1', () => {
    const content = fs.readFileSync(path.join(scriptsDir, '02_create_artifact_registry.sh'), 'utf-8');
    assert.ok(content.includes('asia-south1'), 'Must default to asia-south1 Mumbai region');
    assert.ok(content.includes('repository-format=docker'), 'Must configure docker OCI format');
    assert.ok(content.includes('pratyaksha-repo'), 'Must target pratyaksha-repo');
  });

  test('03_setup_iam_service_account implements least privilege without owner/editor roles', () => {
    const content = fs.readFileSync(path.join(scriptsDir, '03_setup_iam_service_account.sh'), 'utf-8');
    assert.ok(content.includes('sa-pratyaksha-runtime'), 'Must create sa-pratyaksha-runtime');

    const requiredRoles = [
      'roles/secretmanager.secretAccessor',
      'roles/cloudsql.client',
      'roles/datastore.user',
      'roles/run.invoker',
    ];

    for (const role of requiredRoles) {
      assert.ok(content.includes(role), `Missing required role: ${role}`);
    }

    // Security check: no wildcard or broad admin roles
    assert.ok(!content.includes('roles/owner'), 'Must not grant owner role');
    assert.ok(!content.includes('roles/editor'), 'Must not grant editor role');
  });

  test('04_configure_secrets provisions required secret slots', () => {
    const content = fs.readFileSync(path.join(scriptsDir, '04_configure_secrets.sh'), 'utf-8');
    assert.ok(content.includes('DATABASE_URL'));
    assert.ok(content.includes('GEE_SERVICE_ACCOUNT_KEY'));
    assert.ok(content.includes('FIREBASE_CONFIG'));
  });

  test('secret templates are structurally valid without live credentials committed', () => {
    const dbTemplate = fs.readFileSync(path.join(templatesDir, 'DATABASE_URL.template.env'), 'utf-8');
    assert.ok(dbTemplate.includes('DATABASE_URL=postgresql://'));
    assert.ok(dbTemplate.includes('cloudsql'));

    const geeTemplateRaw = fs.readFileSync(path.join(templatesDir, 'GEE_SERVICE_ACCOUNT_KEY.template.json'), 'utf-8');
    const geeJson = JSON.parse(geeTemplateRaw);
    assert.strictEqual(geeJson.type, 'service_account');
    assert.ok(geeJson.client_email.includes('REPLACE_WITH_PROJECT_ID'));

    const fbTemplateRaw = fs.readFileSync(path.join(templatesDir, 'FIREBASE_CONFIG.template.json'), 'utf-8');
    const fbJson = JSON.parse(fbTemplateRaw);
    assert.ok(fbJson.projectId.includes('REPLACE_WITH_PROJECT_ID'));
  });
});
