# PRATYAKSHA Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **PII Isolation**: `/users/{userId}` documents contain `email` and officer metadata; reads and writes are strictly restricted to `request.auth.uid == userId` (or verified bootstrapped admin). No `list` access is permitted on `/users`.
2. **Owner Integrity**: Every document in `/action_plans`, `/anomaly_reviews`, and `/processing_jobs` must carry `ownerId == request.auth.uid` on creation, and `ownerId` is immutable on update.
3. **Verified Identity**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
4. **Terminal State Locking**:
   - `action_plans` with `status == 'archived'` cannot be modified by non-admins.
   - `anomaly_reviews` with `status == 'resolved'` cannot be modified by non-admins.
   - `processing_jobs` with `status == 'completed'` are immutable audit records.
5. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable; `updatedAt` must equal `request.time` on creation and update.
6. **Bounded Payloads & Path Hardening**: Every single-document ID must match `^[a-zA-Z0-9_-]{1,128}$`, every string enforces `.size()` limits, and `priorityActions` is capped at `<= 10` items.
7. **Secure List Queries**: `allow list` on `/action_plans`, `/anomaly_reviews`, and `/processing_jobs` explicitly checks `resource.data.ownerId == request.auth.uid` (or `isAdmin()`), never delegating filtering to the client.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: Reading `/action_plans/plan-01` without `request.auth` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Creating `/action_plans/plan-01` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection (User)**: Creating `/users/{uid}` with extra field `role: 'admin'` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection (Action Plan)**: Updating `/action_plans/plan-01` with ghost field `isVerified: true` -> `PERMISSION_DENIED`.
5. **Identity Spoofing**: Creating `/anomaly_reviews/rev-01` with `ownerId: 'victim_uid'` -> `PERMISSION_DENIED`.
6. **PII Cross-User Read**: Authenticated User B attempting `get` on `/users/user_a` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: Creating `/action_plans/<1500-char-invalid-id>` -> `PERMISSION_DENIED`.
8. **Terminal State Mutation**: Non-admin updating an `action_plans` document whose `status` is `'archived'` -> `PERMISSION_DENIED`.
9. **Immutable Field Tampering**: Updating `createdAt` or `ownerId` on `/anomaly_reviews/rev-01` -> `PERMISSION_DENIED`.
10. **Client Timestamp Spoofing**: Creating `/processing_jobs/job-01` with client-forged `createdAt` != `request.time` -> `PERMISSION_DENIED`.
11. **Unbounded Array / Value Poisoning**: Creating `/action_plans/plan-01` with `priorityActions` containing 15 items or non-string first element -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: User B issuing unconstrained `list` query on `/action_plans` containing User A's documents -> `PERMISSION_DENIED`.
