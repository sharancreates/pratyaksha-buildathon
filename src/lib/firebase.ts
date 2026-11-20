import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'pratyaksha-demo.firebaseapp.com',
  projectId: 'pratyaksha-demo',
  storageBucket: 'pratyaksha-demo.appspot.com',
  messagingSenderId: '100000000000',
  appId: '1:100000000000:web:abcdef123456',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  READ = 'READ',
  WRITE = 'WRITE',
  LIST = 'LIST',
  DELETE = 'DELETE',
}

export function handleFirestoreError(
  error: unknown,
  operation: OperationType,
  path: string
): never {
  const message = error instanceof Error ? error.message : String(error);
  const formatted = `[Firestore Security Rule / Network Error] Op: ${operation} Path: ${path} Reason: ${message}`;
  console.warn(formatted);
  throw new Error(formatted);
}
