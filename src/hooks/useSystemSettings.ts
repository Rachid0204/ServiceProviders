import { useState, useEffect } from 'react';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, reportFirestoreError, OperationType } from '../firebase';
import {
  DEFAULT_SYSTEM_SETTINGS,
  type SystemSettingsRecord,
} from '../utils/systemSettings';

const SETTINGS_STORAGE_KEY = 'moul_lkhedma_system_settings';

function formatSettingsTimestamp(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      const d = (ts as Timestamp).toDate();
      return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
    } catch {
      // fallback
    }
  }
  return DEFAULT_SYSTEM_SETTINGS.updatedAtIso;
}

/**
 * Subscribes to Firestore `systemSettings/global` when authenticated so commission rates
 * and escrow policies stay consistent across marketplace bookings and the Admin console.
 */
export function useSystemSettings(firebaseUser: User | null, authReady: boolean) {
  const [systemSettings, setSystemSettings] = useState<SystemSettingsRecord>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SYSTEM_SETTINGS, ...(JSON.parse(raw) as SystemSettingsRecord) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SYSTEM_SETTINGS;
  });

  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const settingsRef = doc(db, 'systemSettings', 'global');
    const unsubscribe = onSnapshot(
      settingsRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const loaded: SystemSettingsRecord = {
          platformFeePct:
            typeof data.platformFeePct === 'number'
              ? Math.round(data.platformFeePct)
              : DEFAULT_SYSTEM_SETTINGS.platformFeePct,
          minWithdrawalMad:
            typeof data.minWithdrawalMad === 'number'
              ? Math.round(data.minWithdrawalMad)
              : DEFAULT_SYSTEM_SETTINGS.minWithdrawalMad,
          autoRefundOnProviderCancel:
            typeof data.autoRefundOnProviderCancel === 'boolean'
              ? data.autoRefundOnProviderCancel
              : DEFAULT_SYSTEM_SETTINGS.autoRefundOnProviderCancel,
          requireKycForEscrowPayout:
            typeof data.requireKycForEscrowPayout === 'boolean'
              ? data.requireKycForEscrowPayout
              : DEFAULT_SYSTEM_SETTINGS.requireKycForEscrowPayout,
          supportWhatsAppPhone:
            typeof data.supportWhatsAppPhone === 'string' && data.supportWhatsAppPhone
              ? data.supportWhatsAppPhone
              : DEFAULT_SYSTEM_SETTINGS.supportWhatsAppPhone,
          updatedByEmail:
            typeof data.updatedByEmail === 'string' && data.updatedByEmail
              ? data.updatedByEmail
              : DEFAULT_SYSTEM_SETTINGS.updatedByEmail,
          updatedAtIso: formatSettingsTimestamp(data.updatedAt),
        };
        setSystemSettings(loaded);
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(loaded));
        } catch {
          // ignore storage quota errors
        }
      },
      (err) => {
        reportFirestoreError(err, OperationType.GET, 'systemSettings/global');
      }
    );

    return () => unsubscribe();
  }, [authReady, firebaseUser]);

  const updateLocalSettings = (next: SystemSettingsRecord) => {
    setSystemSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  return { systemSettings, updateLocalSettings };
}
