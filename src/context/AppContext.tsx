import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type { MunicipalityId } from '../shared/types';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'info' | 'success' | 'warning' | 'error';
}

interface AppContextValue {
  municipality: MunicipalityId;
  setMunicipality: (city: MunicipalityId) => void;
  user: User | null;
  authReady: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  selectedAnomalyId: string | null;
  setSelectedAnomalyId: (id: string | null) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const MUNICIPALITY_OPTIONS: {
  id: MunicipalityId;
  name: string;
  state: string;
  shortCorp: string;
}[] = [
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', shortCorp: 'AMC' },
  { id: 'delhi', name: 'Delhi', state: 'NCT of Delhi', shortCorp: 'MCD' },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', shortCorp: 'BMC' },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', shortCorp: 'BBMP' },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', shortCorp: 'GCC' },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [municipality, setMunicipalityState] = useState<MunicipalityId>('ahmedabad');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setMunicipality = useCallback(
    (city: MunicipalityId) => {
      setMunicipalityState(city);
      const found = MUNICIPALITY_OPTIONS.find((m) => m.id === city);
      pushToast({
        title: `Switched region to ${found?.name ?? city}`,
        description: `Synchronizing satellite layers, ML consensus, and forecasts for ${found?.shortCorp ?? ''}.`,
        variant: 'info',
      });
    },
    [pushToast]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (nextUser && nextUser.emailVerified) {
        const userRef = doc(db, 'users', nextUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: nextUser.uid,
              displayName: (nextUser.displayName || 'Municipal Officer').slice(0, 120),
              email: (nextUser.email || 'officer@municipality.gov.in').slice(0, 254),
              department: 'Municipal Environmental Command',
              municipalityId: 'ahmedabad',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.WRITE, `users/${nextUser.uid}`);
          } catch {
            // Non-blocking profile sync log
          }
        }
      }
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      pushToast({
        title: 'Officer session authenticated',
        description: 'Firestore cloud persistence enabled for action plans, reviews, and jobs.',
        variant: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Sign-in cancelled or unavailable',
        description: err instanceof Error ? err.message : 'Continuing in local demonstration session.',
        variant: 'warning',
      });
    }
  }, [pushToast]);

  const logout = useCallback(async () => {
    await signOut(auth);
    pushToast({
      title: 'Signed out',
      description: 'Switched back to read-only observer session.',
      variant: 'info',
    });
  }, [pushToast]);

  return (
    <AppContext.Provider
      value={{
        municipality,
        setMunicipality,
        user,
        authReady,
        signInWithGoogle,
        logout,
        toasts,
        pushToast,
        dismissToast,
        selectedAnomalyId,
        setSelectedAnomalyId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
