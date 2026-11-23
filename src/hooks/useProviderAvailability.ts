import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db, reportFirestoreError, OperationType } from '../firebase';
import {
  TIME_SLOTS,
  WEEKDAY_KEYS,
  createDefaultWeeklySchedule,
  type LanguageCode,
  type ProviderWeeklySchedule,
  type TimeSlot,
  type WeekdayKey,
} from '../utils/marketplace';

function formatIso(ts: unknown): string | undefined {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      return (ts as Timestamp).toDate().toISOString().slice(0, 10);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function useProviderAvailability(uid: string | null | undefined, lang: LanguageCode) {
  const [schedule, setSchedule] = useState<ProviderWeeklySchedule>(() =>
    createDefaultWeeklySchedule(uid || '')
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setSchedule(createDefaultWeeklySchedule(''));
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'providerAvailability', uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setSchedule(createDefaultWeeklySchedule(uid));
          setLoading(false);
          return;
        }
        const data = snap.data();
        const defaults = createDefaultWeeklySchedule(uid);
        const days = { ...defaults.days };
        if (data.days && typeof data.days === 'object') {
          for (const key of WEEKDAY_KEYS) {
            const rawDay = (data.days as Record<string, { enabled?: boolean; slots?: unknown[] }>)[key];
            if (rawDay && typeof rawDay === 'object') {
              const validSlots = Array.isArray(rawDay.slots)
                ? rawDay.slots.filter((s): s is TimeSlot => TIME_SLOTS.includes(s as TimeSlot))
                : [];
              days[key as WeekdayKey] = {
                enabled: Boolean(rawDay.enabled),
                slots: validSlots,
              };
            }
          }
        }
        const blockedDates = Array.isArray(data.blockedDates)
          ? data.blockedDates
              .map(String)
              .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
              .slice(0, 60)
          : [];

        setSchedule({
          uid,
          days,
          blockedDates,
          acceptsUrgentSameDay: Boolean(data.acceptsUrgentSameDay ?? true),
          updatedAtIso: formatIso(data.updatedAt),
        });
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        reportFirestoreError(err, OperationType.GET, `providerAvailability/${uid}`);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const saveAvailability = useCallback(
    async (next: ProviderWeeklySchedule): Promise<boolean> => {
      if (!uid) return false;
      setError(null);
      setSaving(true);
      try {
        await setDoc(doc(db, 'providerAvailability', uid), {
          uid,
          days: next.days,
          blockedDates: Array.from(new Set(next.blockedDates))
            .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
            .sort()
            .slice(0, 60),
          acceptsUrgentSameDay: Boolean(next.acceptsUrgentSameDay),
          updatedAt: serverTimestamp(),
        });
        return true;
      } catch (err) {
        reportFirestoreError(err, OperationType.WRITE, `providerAvailability/${uid}`);
        setError(
          lang === 'ar'
            ? 'تعذر حفظ جدول المواعيد حالياً.'
            : 'Impossible d’enregistrer vos disponibilités pour le moment.'
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [uid, lang]
  );

  return {
    schedule,
    loading,
    saving,
    error,
    saveAvailability,
  };
}
