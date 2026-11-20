/**
 * PRATYAKSHA Firestore Security Rules Verification Suite (Phase 0 TDD)
 * Documents the Dirty Dozen negative assertions and positive owner-scoped assertions
 * enforced by firestore.rules.
 */

export interface SecurityTestCase {
  id: string;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'ALLOW' | 'PERMISSION_DENIED';
  rationale: string;
}

export const DIRTY_DOZEN_CASES: SecurityTestCase[] = [
  {
    id: 'DD-01',
    name: 'Unauthenticated action_plans read',
    collection: '/action_plans/plan_ahm_01',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    rationale: 'Requires request.auth != null and owner match.',
  },
  {
    id: 'DD-02',
    name: 'Unverified email action_plans create',
    collection: '/action_plans/plan_ahm_01',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Requires request.auth.token.email_verified == true.',
  },
  {
    id: 'DD-03',
    name: 'Shadow field role injection on user profile',
    collection: '/users/uid_officer_1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Blocked by data.keys().hasOnly([...]) excluding role/isAdmin.',
  },
  {
    id: 'DD-04',
    name: 'Shadow field injection on action plan update',
    collection: '/action_plans/plan_ahm_01',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'Blocked by affectedKeys().hasOnly([...]) and isValidActionPlan().',
  },
  {
    id: 'DD-05',
    name: 'Cross-user ownerId spoofing on anomaly review',
    collection: '/anomaly_reviews/rev_ahm_01',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidAnomalyReview enforces data.ownerId == request.auth.uid.',
  },
  {
    id: 'DD-06',
    name: 'Cross-user PII get on users collection',
    collection: '/users/uid_other_officer',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    rationale: 'Users collection restricts get strictly to isOwner(userId) || isAdmin().',
  },
  {
    id: 'DD-07',
    name: 'Path ID poisoning with >128 chars or special characters',
    collection: '/action_plans/invalid$id!payload',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Blocked by isValidId(planId) regex and size <= 128.',
  },
  {
    id: 'DD-08',
    name: 'Mutating archived terminal action plan',
    collection: '/action_plans/plan_archived',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'Terminal state lock blocks non-admin updates when existing().status == archived.',
  },
  {
    id: 'DD-09',
    name: 'Tampering with immutable createdAt or ownerId',
    collection: '/anomaly_reviews/rev_ahm_01',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'Immortal field rule enforces incoming().ownerId == existing().ownerId and createdAt unchanged.',
  },
  {
    id: 'DD-10',
    name: 'Spoofing client timestamp on processing_jobs create',
    collection: '/processing_jobs/job_01',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Temporal integrity requires incoming().createdAt == request.time.',
  },
  {
    id: 'DD-11',
    name: 'Unbounded priorityActions list (>10 items) or invalid type',
    collection: '/action_plans/plan_overflow',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Total array guard enforces size <= 10 and first element string type/size.',
  },
  {
    id: 'DD-12',
    name: 'Blanket un-scoped list query on action_plans',
    collection: '/action_plans',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    rationale: 'allow list explicitly requires resource.data.ownerId == request.auth.uid || isAdmin().',
  },
];
