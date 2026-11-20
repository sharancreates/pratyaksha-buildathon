import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('cloudSqlPostgres: Cloud SQL & Firestore Provisioning Validation', () => {
  const rootDir = process.cwd();
  const scriptsDir = path.join(rootDir, 'scripts', 'gcp');
  const migrationPath = path.join(rootDir, 'backend', 'database', 'migrations', '001_init_postgis.sql');
  const firestoreIndexesPath = path.join(rootDir, 'firestore.indexes.json');

  test('all Phase 5 provisioning and migration scripts exist', () => {
    const requiredScripts = [
      '05_provision_cloud_sql.sh',
      '05_provision_cloud_sql.ps1',
      '06_run_migrations.sh',
      '06_run_migrations.ps1',
      '07_deploy_firestore_rules.sh',
      '07_deploy_firestore_rules.ps1',
    ];

    for (const s of requiredScripts) {
      const p = path.join(scriptsDir, s);
      assert.ok(fs.existsSync(p), `Missing script: ${s}`);
    }
  });

  test('05_provision_cloud_sql configures PostgreSQL 15, PostGIS flags and tier in asia-south1', () => {
    const shContent = fs.readFileSync(path.join(scriptsDir, '05_provision_cloud_sql.sh'), 'utf-8');
    const psContent = fs.readFileSync(path.join(scriptsDir, '05_provision_cloud_sql.ps1'), 'utf-8');

    assert.ok(shContent.includes('POSTGRES_15'), 'Must use PostgreSQL 15');
    assert.ok(shContent.includes('db-custom-1-3840'), 'Must allocate db-custom-1-3840');
    assert.ok(shContent.includes('asia-south1'), 'Must default to asia-south1 Mumbai region');
    assert.ok(shContent.includes('cloudsql.enable_pgaudit=on'), 'Must enable pgaudit flag');
    assert.ok(shContent.includes('shared_preload_libraries=pg_stat_statements'), 'Must enable pg_stat_statements');

    assert.ok(psContent.includes('POSTGRES_15'));
    assert.ok(psContent.includes('db-custom-1-3840'));
    assert.ok(psContent.includes('asia-south1'));
  });

  test('001_init_postgis.sql defines PostGIS extension and all 9 core tables', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration SQL file must exist');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    assert.ok(sql.includes('CREATE EXTENSION IF NOT EXISTS postgis;'), 'Must initialize postgis extension');

    const expectedTables = [
      'users',
      'municipalities',
      'satellite_missions',
      'satellite_observations',
      'environmental_indicators',
      'anomaly_events',
      'forecasts',
      'land_cover_results',
      'action_plans',
    ];

    for (const tbl of expectedTables) {
      assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Missing table DDL: ${tbl}`);
    }

    // Verify spatial indices
    assert.ok(sql.includes('USING GIST'), 'Must create GIST spatial indexes');
    assert.ok(sql.includes('boundary_geom'));
    assert.ok(sql.includes('center_geom'));

    // Verify 5-city seed data
    assert.ok(sql.includes("'ahmedabad'"));
    assert.ok(sql.includes("'delhi'"));
    assert.ok(sql.includes("'mumbai'"));
    assert.ok(sql.includes("'bengaluru'"));
    assert.ok(sql.includes("'chennai'"));
  });

  test('firestore.indexes.json specifies valid composite query indexes', () => {
    assert.ok(fs.existsSync(firestoreIndexesPath), 'firestore.indexes.json must exist');
    const raw = fs.readFileSync(firestoreIndexesPath, 'utf-8');
    const parsed = JSON.parse(raw);

    assert.ok(Array.isArray(parsed.indexes), 'Indexes must be an array');
    const collections = parsed.indexes.map((idx: { collectionGroup: string }) => idx.collectionGroup);

    assert.ok(collections.includes('action_plans'), 'Must include index for action_plans');
    assert.ok(collections.includes('anomaly_reviews'), 'Must include index for anomaly_reviews');
    assert.ok(collections.includes('processing_jobs'), 'Must include index for processing_jobs');
  });
});
