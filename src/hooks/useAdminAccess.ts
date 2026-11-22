import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { hasAdminCustomClaim, isVerifiedAuthUser } from '../utils/authHelpers';

/**
 * Lightweight admin-privilege check for marketplace navigation without importing
 * `useAdminData` or `adminMetrics` into the initial entry bundle.
 */
export function useAdminAccess(firebaseUser: User | null, authReady: boolean): boolean {
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  useEffect(() => {
    if (!authReady || !firebaseUser || !isVerifiedAuthUser(firebaseUser)) {
      setHasAdminAccess(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (cancelled) return;
        if (hasAdminCustomClaim(tokenResult.claims)) {
          setHasAdminAccess(true);
          return;
        }
      } catch {
        // Fallback to /admins/{uid} lookup
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
        if (!cancelled) {
          setHasAdminAccess(adminSnap.exists());
        }
      } catch {
        if (!cancelled) setHasAdminAccess(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, firebaseUser]);

  return hasAdminAccess;
}
