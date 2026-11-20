import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSecurityRule, type AuthContext } from './rulesEvaluator.ts';

const NOW = '2026-11-20T12:00:00.000Z';

const officerAuth: AuthContext = {
  uid: 'uid_officer_1',
  token: { email: 'officer1@amc.gov.in', email_verified: true },
};

const unverifiedAuth: AuthContext = {
  uid: 'uid_officer_unverified',
  token: { email: 'unverified@amc.gov.in', email_verified: false },
};

const attackerAuth: AuthContext = {
  uid: 'uid_attacker',
  token: { email: 'attacker@evil.org', email_verified: true },
};

const adminAuth: AuthContext = {
  uid: 'uid_admin',
  token: { email: 'sharanyanagar2@gmail.com', email_verified: true },
};

describe('Firestore Security Rules: The "Dirty Dozen" Adversarial Test Suite', () => {
  test('DD-01: Unauthenticated action_plans read -> PERMISSION_DENIED', () => {
    const res = evaluateSecurityRule({
      path: '/action_plans/plan_ahm_01',
      operation: 'get',
      auth: null,
      resource: { data: { ownerId: 'uid_officer_1' } },
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-02: Unverified email action_plans create -> PERMISSION_DENIED', () => {
    const res = evaluateSecurityRule({
      path: '/action_plans/plan_ahm_01',
      operation: 'create',
      auth: unverifiedAuth,
      requestResource: {
        data: {
          ownerId: 'uid_officer_unverified',
          municipalityId: 'ahmedabad',
          municipalityName: 'Ahmedabad',
          title: 'Heat Wave Action Plan',
          executiveSummary: 'Detailed cooling initiatives for Ahmedabad.',
          healthScore: 78,
          anomalyCount: 4,
          recommendationCount: 3,
          priorityActions: ['Install cool roofs in central wards.'],
          status: 'draft',
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-03: Shadow field role injection on user profile -> PERMISSION_DENIED', () => {
    const res = evaluateSecurityRule({
      path: '/users/uid_officer_1',
      operation: 'create',
      auth: officerAuth,
      requestResource: {
        data: {
          uid: 'uid_officer_1',
          displayName: 'Officer Patel',
          email: 'officer1@amc.gov.in',
          department: 'Urban Development',
          municipalityId: 'ahmedabad',
          createdAt: NOW,
          updatedAt: NOW,
          role: 'admin', // Injected shadow field
        },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-04: Shadow field injection on action plan update -> PERMISSION_DENIED', () => {
    const existingPlan = {
      ownerId: 'uid_officer_1',
      municipalityId: 'ahmedabad',
      municipalityName: 'Ahmedabad',
      title: 'Heat Wave Action Plan',
      executiveSummary: 'Detailed cooling initiatives for Ahmedabad.',
      healthScore: 78,
      anomalyCount: 4,
      recommendationCount: 3,
      priorityActions: ['Install cool roofs.'],
      status: 'draft',
      createdAt: NOW,
      updatedAt: NOW,
    };

    const res = evaluateSecurityRule({
      path: '/action_plans/plan_ahm_01',
      operation: 'update',
      auth: officerAuth,
      resource: { data: existingPlan },
      requestResource: {
        data: {
          ...existingPlan,
          isVerifiedByState: true, // Ghost field
          updatedAt: NOW,
        },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-05: Cross-user ownerId spoofing on anomaly review -> PERMISSION_DENIED', () => {
    const res = evaluateSecurityRule({
      path: '/anomaly_reviews/rev_ahm_01',
      operation: 'create',
      auth: attackerAuth,
      requestResource: {
        data: {
          ownerId: 'uid_officer_1', // Spoofed victim owner
          municipalityId: 'ahmedabad',
          anomalyId: 'ANOM-101',
          indicator: 'lst',
          severity: 'critical',
          status: 'open',
          assignedDepartment: 'Health & Climate',
          notes: 'Unassigned inspection note.',
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-06: Cross-user PII read on users collection -> PERMISSION_DENIED', () => {
    const res = evaluateSecurityRule({
      path: '/users/uid_officer_1',
      operation: 'get',
      auth: attackerAuth,
      resource: { data: { uid: 'uid_officer_1', email: 'officer1@amc.gov.in' } },
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-07: ID poisoning (>128 chars or special chars) -> PERMISSION_DENIED', () => {
    const poisonedId = 'a'.repeat(200);
    const res = evaluateSecurityRule({
      path: `/action_plans/${poisonedId}`,
      operation: 'get',
      auth: officerAuth,
      resource: { data: { ownerId: 'uid_officer_1' } },
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-08: Terminal state mutation on archived action plan -> PERMISSION_DENIED', () => {
    const archivedPlan = {
      ownerId: 'uid_officer_1',
      municipalityId: 'ahmedabad',
      municipalityName: 'Ahmedabad',
      title: 'Archived Plan',
      executiveSummary: 'This action plan is permanently locked.',
      healthScore: 65,
      anomalyCount: 2,
      recommendationCount: 1,
      priorityActions: ['Action completed.'],
      status: 'archived',
      createdAt: NOW,
      updatedAt: NOW,
    };

    const res = evaluateSecurityRule({
      path: '/action_plans/plan_archived_01',
      operation: 'update',
      auth: officerAuth,
      resource: { data: archivedPlan },
      requestResource: {
        data: { ...archivedPlan, title: 'Attempted Tamper', updatedAt: NOW },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-09: Immutable field tampering (createdAt / ownerId) on anomaly review -> PERMISSION_DENIED', () => {
    const existingReview = {
      ownerId: 'uid_officer_1',
      municipalityId: 'ahmedabad',
      anomalyId: 'ANOM-101',
      indicator: 'lst',
      severity: 'critical',
      status: 'open',
      assignedDepartment: 'Health',
      notes: 'Initial triage.',
      createdAt: NOW,
      updatedAt: NOW,
    };

    const res = evaluateSecurityRule({
      path: '/anomaly_reviews/rev_ahm_01',
      operation: 'update',
      auth: officerAuth,
      resource: { data: existingReview },
      requestResource: {
        data: { ...existingReview, ownerId: 'uid_other', updatedAt: NOW },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-10: Client timestamp spoofing on processing jobs -> PERMISSION_DENIED', () => {
    const res = evaluateSecurityRule({
      path: '/processing_jobs/job_01',
      operation: 'create',
      auth: officerAuth,
      requestResource: {
        data: {
          ownerId: 'uid_officer_1',
          municipalityId: 'ahmedabad',
          mission: 'sentinel-2',
          jobType: 'harmonize',
          status: 'running',
          rawCount: 10,
          processedCount: 10,
          failedCount: 0,
          durationMs: 450,
          createdAt: '2020-01-01T00:00:00.000Z', // Client forged historical timestamp
        },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-11: Unbounded array poisoning (>10 priority actions) -> PERMISSION_DENIED', () => {
    const oversizedActions = Array.from({ length: 15 }, (_, i) => `Action item ${i + 1}`);
    const res = evaluateSecurityRule({
      path: '/action_plans/plan_ahm_01',
      operation: 'create',
      auth: officerAuth,
      requestResource: {
        data: {
          ownerId: 'uid_officer_1',
          municipalityId: 'ahmedabad',
          municipalityName: 'Ahmedabad',
          title: 'Overloaded Plan',
          executiveSummary: 'This plan exceeds the invariant action item limit.',
          healthScore: 70,
          anomalyCount: 5,
          recommendationCount: 15,
          priorityActions: oversizedActions,
          status: 'draft',
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });

  test('DD-12: Blanket list scraping across tenants on users collection -> PERMISSION_DENIED', () => {
    const res = evaluateSecurityRule({
      path: '/users',
      operation: 'list',
      auth: officerAuth,
    });
    assert.strictEqual(res, 'PERMISSION_DENIED');
  });
});

describe('Firestore Security Rules: Positive Authorized Assertions', () => {
  test('ALLOW: Verified officer creates valid user profile', () => {
    const res = evaluateSecurityRule({
      path: '/users/uid_officer_1',
      operation: 'create',
      auth: officerAuth,
      requestResource: {
        data: {
          uid: 'uid_officer_1',
          displayName: 'Officer Patel',
          email: 'officer1@amc.gov.in',
          department: 'Environment & Climate',
          municipalityId: 'ahmedabad',
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'ALLOW');
  });

  test('ALLOW: Verified officer creates valid draft action plan', () => {
    const res = evaluateSecurityRule({
      path: '/action_plans/plan_ahm_01',
      operation: 'create',
      auth: officerAuth,
      requestResource: {
        data: {
          ownerId: 'uid_officer_1',
          municipalityId: 'ahmedabad',
          municipalityName: 'Ahmedabad',
          title: 'Ahmedabad Heat Action Plan 2026',
          executiveSummary: 'Targeted cooling and green roof interventions across 6 wards.',
          healthScore: 74,
          anomalyCount: 3,
          recommendationCount: 2,
          priorityActions: ['Install cool roof coatings in Danilimda.'],
          status: 'draft',
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'ALLOW');
  });

  test('ALLOW: Owner officer gets own action plan', () => {
    const res = evaluateSecurityRule({
      path: '/action_plans/plan_ahm_01',
      operation: 'get',
      auth: officerAuth,
      resource: { data: { ownerId: 'uid_officer_1' } },
    });
    assert.strictEqual(res, 'ALLOW');
  });

  test('ALLOW: Admin updates any action plan regardless of ownership', () => {
    const existingPlan = {
      ownerId: 'uid_officer_1',
      municipalityId: 'ahmedabad',
      municipalityName: 'Ahmedabad',
      title: 'Heat Plan',
      executiveSummary: 'Cooling measures description.',
      healthScore: 80,
      anomalyCount: 1,
      recommendationCount: 1,
      priorityActions: ['Cool roof deployment.'],
      status: 'draft',
      createdAt: NOW,
      updatedAt: NOW,
    };

    const res = evaluateSecurityRule({
      path: '/action_plans/plan_ahm_01',
      operation: 'update',
      auth: adminAuth,
      resource: { data: existingPlan },
      requestResource: {
        data: { ...existingPlan, status: 'approved', updatedAt: NOW },
      },
      requestTime: NOW,
    });
    assert.strictEqual(res, 'ALLOW');
  });
});
