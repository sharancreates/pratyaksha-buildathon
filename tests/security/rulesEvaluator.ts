/**
 * PRATYAKSHA In-Process Firestore Rules Evaluator
 * Faithfully mirrors the predicate logic and invariants in firestore.rules
 */

export interface AuthContext {
  uid: string;
  token?: {
    email?: string;
    email_verified?: boolean;
    [key: string]: unknown;
  };
}

export interface SecurityEvaluationRequest {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: AuthContext | null;
  resource?: { data: Record<string, unknown> } | null;
  requestResource?: { data: Record<string, unknown> } | null;
  requestTime?: string;
}

export type EvaluationResult = 'ALLOW' | 'PERMISSION_DENIED';

const VALID_MUNICIPALITIES = new Set(['ahmedabad', 'delhi', 'mumbai', 'bengaluru', 'chennai']);

function isSignedIn(auth: AuthContext | null): boolean {
  return auth !== null && Boolean(auth.uid);
}

function isVerified(auth: AuthContext | null): boolean {
  return isSignedIn(auth) && auth?.token?.email_verified === true;
}

function isOwner(auth: AuthContext | null, userId: string): boolean {
  return isSignedIn(auth) && auth?.uid === userId;
}

function isAdmin(auth: AuthContext | null): boolean {
  return isVerified(auth) && auth?.token?.email === 'sharanyanagar2@gmail.com';
}

function isValidId(id: unknown): boolean {
  return (
    typeof id === 'string' &&
    id.length >= 1 &&
    id.length <= 128 &&
    /^[a-zA-Z0-9_\-]+$/.test(id)
  );
}

function isValidMunicipality(m: unknown): boolean {
  return typeof m === 'string' && VALID_MUNICIPALITIES.has(m);
}

function hasOnlyKeys(data: Record<string, unknown>, allowed: string[]): boolean {
  const allowedSet = new Set(allowed);
  const keys = Object.keys(data);
  return keys.length === allowed.length && keys.every((k) => allowedSet.has(k));
}

function getAffectedKeys(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>
): string[] {
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(incoming), ...Object.keys(existing)]);
  for (const k of allKeys) {
    if (JSON.stringify(incoming[k]) !== JSON.stringify(existing[k])) {
      changed.push(k);
    }
  }
  return changed;
}

function isValidUserProfile(data: Record<string, unknown>, auth: AuthContext | null): boolean {
  const required = ['uid', 'displayName', 'email', 'department', 'municipalityId', 'createdAt', 'updatedAt'];
  if (!hasOnlyKeys(data, required)) return false;
  if (!isValidId(data.uid) || data.uid !== auth?.uid) return false;
  if (typeof data.displayName !== 'string' || data.displayName.length < 1 || data.displayName.length > 120) return false;
  if (typeof data.email !== 'string' || data.email.length < 3 || data.email.length > 254) return false;
  if (typeof data.department !== 'string' || data.department.length < 1 || data.department.length > 120) return false;
  if (!isValidMunicipality(data.municipalityId)) return false;
  if (!data.createdAt || !data.updatedAt) return false;
  return true;
}

function isValidPriorityActions(arr: unknown): boolean {
  if (!Array.isArray(arr) || arr.length < 1 || arr.length > 10) return false;
  const first = arr[0];
  if (typeof first !== 'string' || first.length < 1 || first.length > 240) return false;
  return true;
}

function isValidActionPlan(data: Record<string, unknown>, auth: AuthContext | null): boolean {
  const required = [
    'ownerId', 'municipalityId', 'municipalityName', 'title',
    'executiveSummary', 'healthScore', 'anomalyCount',
    'recommendationCount', 'priorityActions', 'status',
    'createdAt', 'updatedAt'
  ];
  if (!hasOnlyKeys(data, required)) return false;
  if (!isValidId(data.ownerId)) return false;
  if (data.ownerId !== auth?.uid && !isAdmin(auth)) return false;
  if (!isValidMunicipality(data.municipalityId)) return false;
  if (typeof data.municipalityName !== 'string' || data.municipalityName.length < 1 || data.municipalityName.length > 80) return false;
  if (typeof data.title !== 'string' || data.title.length < 3 || data.title.length > 180) return false;
  if (typeof data.executiveSummary !== 'string' || data.executiveSummary.length < 10 || data.executiveSummary.length > 2000) return false;
  if (typeof data.healthScore !== 'number' || data.healthScore < 0 || data.healthScore > 100) return false;
  if (typeof data.anomalyCount !== 'number' || data.anomalyCount < 0 || data.anomalyCount > 500) return false;
  if (typeof data.recommendationCount !== 'number' || data.recommendationCount < 0 || data.recommendationCount > 100) return false;
  if (!isValidPriorityActions(data.priorityActions)) return false;
  if (typeof data.status !== 'string' || !['draft', 'approved', 'archived'].includes(data.status)) return false;
  if (!data.createdAt || !data.updatedAt) return false;
  return true;
}

function isValidAnomalyReview(data: Record<string, unknown>, auth: AuthContext | null): boolean {
  const required = [
    'ownerId', 'municipalityId', 'anomalyId', 'indicator',
    'severity', 'status', 'assignedDepartment', 'notes',
    'createdAt', 'updatedAt'
  ];
  if (!hasOnlyKeys(data, required)) return false;
  if (!isValidId(data.ownerId)) return false;
  if (data.ownerId !== auth?.uid && !isAdmin(auth)) return false;
  if (!isValidMunicipality(data.municipalityId)) return false;
  if (!isValidId(data.anomalyId)) return false;
  if (typeof data.indicator !== 'string' || data.indicator.length < 2 || data.indicator.length > 80) return false;
  if (typeof data.severity !== 'string' || !['low', 'moderate', 'high', 'critical'].includes(data.severity)) return false;
  if (typeof data.status !== 'string' || !['open', 'investigating', 'mitigated', 'resolved'].includes(data.status)) return false;
  if (typeof data.assignedDepartment !== 'string' || data.assignedDepartment.length < 2 || data.assignedDepartment.length > 120) return false;
  if (typeof data.notes !== 'string' || data.notes.length > 1000) return false;
  if (!data.createdAt || !data.updatedAt) return false;
  return true;
}

function isValidProcessingJob(data: Record<string, unknown>, auth: AuthContext | null): boolean {
  const required = [
    'ownerId', 'municipalityId', 'mission', 'jobType',
    'status', 'rawCount', 'processedCount', 'failedCount',
    'durationMs', 'createdAt'
  ];
  if (!hasOnlyKeys(data, required)) return false;
  if (!isValidId(data.ownerId) || data.ownerId !== auth?.uid) return false;
  if (!isValidMunicipality(data.municipalityId)) return false;
  if (typeof data.mission !== 'string' || data.mission.length < 2 || data.mission.length > 64) return false;
  if (typeof data.jobType !== 'string' || !['ingest', 'harmonize', 'anomaly_scan', 'segmentation'].includes(data.jobType)) return false;
  if (typeof data.status !== 'string' || !['queued', 'running', 'completed'].includes(data.status)) return false;
  if (typeof data.rawCount !== 'number' || data.rawCount < 0 || data.rawCount > 100000) return false;
  if (typeof data.processedCount !== 'number' || data.processedCount < 0 || data.processedCount > 100000) return false;
  if (typeof data.failedCount !== 'number' || data.failedCount < 0 || data.failedCount > 100000) return false;
  if (typeof data.durationMs !== 'number' || data.durationMs < 0 || data.durationMs > 3600000) return false;
  if (!data.createdAt) return false;
  return true;
}

export function evaluateSecurityRule(req: SecurityEvaluationRequest): EvaluationResult {
  const { path, operation, auth, resource, requestResource, requestTime = '2026-11-20T00:00:00.000Z' } = req;
  const parts = path.replace(/^\//, '').split('/');
  const collection = parts[0];
  const docId = parts[1];

  // Global deny default
  if (!collection || !docId && operation !== 'list') {
    return 'PERMISSION_DENIED';
  }

  // 1. /users/{userId}
  if (collection === 'users') {
    const userId = docId;
    if (operation === 'list') {
      return 'PERMISSION_DENIED';
    }
    if (operation === 'get') {
      if (isSignedIn(auth) && isValidId(userId) && (isOwner(auth, userId) || isAdmin(auth))) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'create') {
      if (!isVerified(auth) || !isValidId(userId) || !isOwner(auth, userId)) return 'PERMISSION_DENIED';
      const inc = requestResource?.data;
      if (!inc || !isValidUserProfile(inc, auth)) return 'PERMISSION_DENIED';
      if (inc.createdAt !== requestTime || inc.updatedAt !== requestTime) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
    if (operation === 'update') {
      if (!isVerified(auth) || !isValidId(userId)) return 'PERMISSION_DENIED';
      const inc = requestResource?.data;
      const exist = resource?.data;
      if (!inc || !exist || !isValidUserProfile(inc, auth)) return 'PERMISSION_DENIED';
      if (isAdmin(auth)) return 'ALLOW';
      if (isOwner(auth, userId)) {
        if (inc.uid !== exist.uid || inc.createdAt !== exist.createdAt || inc.updatedAt !== requestTime) {
          return 'PERMISSION_DENIED';
        }
        const affected = getAffectedKeys(inc, exist);
        const allowedUpdates = new Set(['displayName', 'department', 'municipalityId', 'updatedAt']);
        if (affected.every((k) => allowedUpdates.has(k))) return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'delete') {
      return isAdmin(auth) && isValidId(userId) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
  }

  // 2. /action_plans/{planId}
  if (collection === 'action_plans') {
    const planId = docId;
    if (operation === 'list') {
      if (isSignedIn(auth) && (resource?.data?.ownerId === auth?.uid || isAdmin(auth))) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'get') {
      if (isSignedIn(auth) && isValidId(planId) && (resource?.data?.ownerId === auth?.uid || isAdmin(auth))) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'create') {
      if (!isVerified(auth) || !isValidId(planId)) return 'PERMISSION_DENIED';
      const inc = requestResource?.data;
      if (!inc || !isValidActionPlan(inc, auth)) return 'PERMISSION_DENIED';
      if (inc.ownerId !== auth?.uid || inc.status !== 'draft') return 'PERMISSION_DENIED';
      if (inc.createdAt !== requestTime || inc.updatedAt !== requestTime) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
    if (operation === 'update') {
      if (!isVerified(auth) || !isValidId(planId)) return 'PERMISSION_DENIED';
      const inc = requestResource?.data;
      const exist = resource?.data;
      if (!inc || !exist || !isValidActionPlan(inc, auth)) return 'PERMISSION_DENIED';
      if (isAdmin(auth)) return 'ALLOW';
      if (exist.ownerId === auth?.uid && exist.status !== 'archived') {
        if (inc.ownerId !== exist.ownerId || inc.createdAt !== exist.createdAt || inc.updatedAt !== requestTime) {
          return 'PERMISSION_DENIED';
        }
        const affected = getAffectedKeys(inc, exist);
        const set1 = new Set(['status', 'updatedAt']);
        const set2 = new Set(['title', 'executiveSummary', 'priorityActions', 'updatedAt']);
        const matchSet1 = affected.length <= 2 && affected.every((k) => set1.has(k));
        const matchSet2 = affected.length <= 4 && affected.every((k) => set2.has(k));
        if (matchSet1 || matchSet2) return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'delete') {
      if (isVerified(auth) && isValidId(planId) && (resource?.data?.ownerId === auth?.uid || isAdmin(auth))) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
  }

  // 3. /anomaly_reviews/{reviewId}
  if (collection === 'anomaly_reviews') {
    const reviewId = docId;
    if (operation === 'list') {
      if (isSignedIn(auth) && (resource?.data?.ownerId === auth?.uid || isAdmin(auth))) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'get') {
      if (isSignedIn(auth) && isValidId(reviewId) && (resource?.data?.ownerId === auth?.uid || isAdmin(auth))) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'create') {
      if (!isVerified(auth) || !isValidId(reviewId)) return 'PERMISSION_DENIED';
      const inc = requestResource?.data;
      if (!inc || !isValidAnomalyReview(inc, auth)) return 'PERMISSION_DENIED';
      if (inc.ownerId !== auth?.uid) return 'PERMISSION_DENIED';
      if (inc.createdAt !== requestTime || inc.updatedAt !== requestTime) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
    if (operation === 'update') {
      if (!isVerified(auth) || !isValidId(reviewId)) return 'PERMISSION_DENIED';
      const inc = requestResource?.data;
      const exist = resource?.data;
      if (!inc || !exist || !isValidAnomalyReview(inc, auth)) return 'PERMISSION_DENIED';
      if (isAdmin(auth)) return 'ALLOW';
      if (exist.ownerId === auth?.uid && exist.status !== 'resolved') {
        if (inc.ownerId !== exist.ownerId || inc.anomalyId !== exist.anomalyId || inc.createdAt !== exist.createdAt || inc.updatedAt !== requestTime) {
          return 'PERMISSION_DENIED';
        }
        const affected = getAffectedKeys(inc, exist);
        const set1 = new Set(['status', 'updatedAt']);
        const set2 = new Set(['status', 'assignedDepartment', 'notes', 'updatedAt']);
        const match1 = affected.length <= 2 && affected.every((k) => set1.has(k));
        const match2 = affected.length <= 4 && affected.every((k) => set2.has(k));
        if (match1 || match2) return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'delete') {
      if (isVerified(auth) && isValidId(reviewId) && (resource?.data?.ownerId === auth?.uid || isAdmin(auth))) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
  }

  // 4. /processing_jobs/{jobId}
  if (collection === 'processing_jobs') {
    const jobId = docId;
    if (operation === 'list') {
      if (isSignedIn(auth) && (resource?.data?.ownerId === auth?.uid || isAdmin(auth))) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'get') {
      if (isSignedIn(auth) && isValidId(jobId) && (resource?.data?.ownerId === auth?.uid || isAdmin(auth))) {
        return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'create') {
      if (!isVerified(auth) || !isValidId(jobId)) return 'PERMISSION_DENIED';
      const inc = requestResource?.data;
      if (!inc || !isValidProcessingJob(inc, auth)) return 'PERMISSION_DENIED';
      if (inc.ownerId !== auth?.uid) return 'PERMISSION_DENIED';
      if (inc.createdAt !== requestTime) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
    if (operation === 'update') {
      if (!isVerified(auth) || !isValidId(jobId)) return 'PERMISSION_DENIED';
      const inc = requestResource?.data;
      const exist = resource?.data;
      if (!inc || !exist || !isValidProcessingJob(inc, auth)) return 'PERMISSION_DENIED';
      if (isAdmin(auth)) return 'ALLOW';
      if (exist.ownerId === auth?.uid && exist.status !== 'completed') {
        if (inc.ownerId !== exist.ownerId || inc.createdAt !== exist.createdAt) {
          return 'PERMISSION_DENIED';
        }
        const affected = getAffectedKeys(inc, exist);
        const allowedUpdates = new Set(['status', 'processedCount', 'failedCount', 'durationMs']);
        if (affected.every((k) => allowedUpdates.has(k))) return 'ALLOW';
      }
      return 'PERMISSION_DENIED';
    }
    if (operation === 'delete') {
      return isAdmin(auth) && isValidId(jobId) ? 'ALLOW' : 'PERMISSION_DENIED';
    }
  }

  return 'PERMISSION_DENIED';
}
