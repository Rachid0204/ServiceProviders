import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { hasAdminCustomClaim, isVerifiedAuthUser } from '../utils/authHelpers';

export interface AdminAccessState {
  hasAdminAccess: boolean;
  isCheckingAdmin: boolean;
}

/**
 * Lightweight admin-privilege check for marketplace navigation and route guards
 * without importing `useAdminData` or `adminMetrics` into the initial entry bundle.
 */
export function useAdminAccess(firebaseUser: User | null, authReady: boolean): AdminAccessState {
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    if (!authReady) {
      setIsCheckingAdmin(true);
      return;
    }

    if (!firebaseUser || !isVerifiedAuthUser(firebaseUser)) {
      setHasAdminAccess(false);
      setIsCheckingAdmin(false);
      return;
    }

    let cancelled = false;
    setIsCheckingAdmin(true);

    (async () => {
      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (cancelled) return;
        if (hasAdminCustomClaim(tokenResult.claims)) {
          setHasAdminAccess(true);
          setIsCheckingAdmin(false);
          return;
        }
      } catch {
        // Fallback to /admins/{uid} lookup
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
        if (!cancelled) {
          setHasAdminAccess(adminSnap.exists());
          setIsCheckingAdmin(false);
        }
      } catch {
        if (!cancelled) {
          setHasAdminAccess(false);
          setIsCheckingAdmin(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, firebaseUser]);

  return { hasAdminAccess, isCheckingAdmin };
}
