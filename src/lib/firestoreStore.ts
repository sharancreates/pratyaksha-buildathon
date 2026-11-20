import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { EnvironmentActionPlan, HarmonizationResult } from '../shared/types';

export interface StoredActionPlanDoc {
  id: string;
  ownerId: string;
  municipalityId: string;
  municipalityName: string;
  title: string;
  status: 'draft' | 'under_review' | 'approved' | 'archived';
  healthIndex: number;
  priorityActions: string[];
  recommendationCount: number;
  generatedAt: string;
  createdAt: any;
  updatedAt: any;
}

export interface StoredAnomalyReviewDoc {
  id: string;
  ownerId: string;
  anomalyId: string;
  wardId: string;
  wardName: string;
  indicator: string;
  status: 'open' | 'investigating' | 'mitigated' | 'resolved';
  notes: string;
  createdAt: any;
  updatedAt: any;
}

export interface StoredProcessingJobDoc {
  id: string;
  ownerId: string;
  jobType: 'ingest' | 'harmonize' | 'segmentation' | 'forecast';
  municipalityId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  targetResolutionM?: number;
  processedObservationCount?: number;
  createdAt: any;
  updatedAt: any;
}

export async function saveActionPlanToFirestore(plan: EnvironmentActionPlan): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const planRef = doc(db, 'action_plans', plan.id);
  const data: StoredActionPlanDoc = {
    id: plan.id,
    ownerId: user.uid,
    municipalityId: plan.municipalityId,
    municipalityName: plan.municipalityName,
    title: plan.title,
    status: 'draft',
    healthIndex: plan.environmentalHealthOverview.healthIndex,
    priorityActions: plan.priorityActions.slice(0, 10),
    recommendationCount: plan.recommendations.length,
    generatedAt: plan.generatedAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(planRef, data);
}

export function subscribeOwnerActionPlans(
  ownerId: string,
  callback: (docs: StoredActionPlanDoc[]) => void
): () => void {
  const q = query(collection(db, 'action_plans'), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => d.data() as StoredActionPlanDoc);
      callback(docs);
    },
    () => callback([])
  );
}

export async function updateActionPlanStatus(
  planId: string,
  status: StoredActionPlanDoc['status']
): Promise<void> {
  const planRef = doc(db, 'action_plans', planId);
  await updateDoc(planRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function saveAnomalyReviewToFirestore(payload: {
  anomalyId: string;
  wardId: string;
  wardName: string;
  indicator: string;
  status: 'open' | 'investigating' | 'mitigated' | 'resolved';
  notes: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const reviewId = `rev-${payload.anomalyId}-${user.uid.slice(0, 6)}`;
  const ref = doc(db, 'anomaly_reviews', reviewId);
  const data: StoredAnomalyReviewDoc = {
    id: reviewId,
    ownerId: user.uid,
    anomalyId: payload.anomalyId,
    wardId: payload.wardId,
    wardName: payload.wardName,
    indicator: payload.indicator,
    status: payload.status,
    notes: payload.notes.slice(0, 500),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, data);
}

export function subscribeOwnerAnomalyReviews(
  ownerId: string,
  callback: (docs: StoredAnomalyReviewDoc[]) => void
): () => void {
  const q = query(collection(db, 'anomaly_reviews'), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => d.data() as StoredAnomalyReviewDoc);
      callback(docs);
    },
    () => callback([])
  );
}

export async function logProcessingJobToFirestore(
  result: HarmonizationResult,
  jobType: 'harmonize' | 'ingest'
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const jobId = `job-${Date.now()}`;
  const ref = doc(db, 'processing_jobs', jobId);
  const data: StoredProcessingJobDoc = {
    id: jobId,
    ownerId: user.uid,
    jobType,
    municipalityId: 'ahmedabad',
    status: 'completed',
    targetResolutionM: result.targetResolutionM,
    processedObservationCount: result.processedObservationCount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, data);
}

export function subscribeOwnerProcessingJobs(
  ownerId: string,
  callback: (docs: StoredProcessingJobDoc[]) => void
): () => void {
  const q = query(collection(db, 'processing_jobs'), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => d.data() as StoredProcessingJobDoc);
      callback(docs);
    },
    () => callback([])
  );
}
