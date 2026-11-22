import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, reportFirestoreError, OperationType } from '../firebase';

const GUEST_FAVORITES_KEY = 'moul_lkhedma_guest_favorites';

function readGuestFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeGuestFavorites(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(ids.slice(0, 100)));
  } catch {
    // Ignore storage quota errors
  }
}

export function useFavorites(firebaseUser: User | null, authReady: boolean, isVerified: boolean) {
  const [favoriteProviderIds, setFavoriteProviderIds] = useState<string[]>(() =>
    readGuestFavorites()
  );

  useEffect(() => {
    if (!authReady) return;

    if (!firebaseUser || !isVerified) {
      setFavoriteProviderIds(readGuestFavorites());
      return;
    }

    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', firebaseUser.uid),
      limit(100)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ids = snapshot.docs
          .map((d) => String(d.data().providerId || ''))
          .filter(Boolean);
        setFavoriteProviderIds(ids);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, `favorites?userId=${firebaseUser.uid}`);
      }
    );

    return () => unsubscribe();
  }, [authReady, firebaseUser, isVerified]);

  const toggleFavoriteProvider = useCallback(
    async (providerId: string) => {
      if (!providerId) return;
      const isCurrentlyFav = favoriteProviderIds.includes(providerId);

      // Optimistic local state update
      const nextIds = isCurrentlyFav
        ? favoriteProviderIds.filter((id) => id !== providerId)
        : [providerId, ...favoriteProviderIds];
      setFavoriteProviderIds(nextIds);

      if (!firebaseUser || !isVerified) {
        writeGuestFavorites(nextIds);
        return;
      }

      const favDocId = `${firebaseUser.uid}_${providerId}`;
      const favRef = doc(db, 'favorites', favDocId);
      try {
        if (isCurrentlyFav) {
          await deleteDoc(favRef);
        } else {
          await setDoc(favRef, {
            userId: firebaseUser.uid,
            providerId,
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        // Revert optimistic update on Firestore failure
        setFavoriteProviderIds(favoriteProviderIds);
        reportFirestoreError(
          err,
          isCurrentlyFav ? OperationType.DELETE : OperationType.CREATE,
          `favorites/${favDocId}`
        );
      }
    },
    [favoriteProviderIds, firebaseUser, isVerified]
  );

  return {
    favoriteProviderIds,
    toggleFavoriteProvider,
  };
}
