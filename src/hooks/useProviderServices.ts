import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db, reportFirestoreError, OperationType } from '../firebase';
import {
  validateProviderServiceInput,
  type LanguageCode,
  type ProviderServiceRecord,
  type ServiceCategory,
  type ServicePricingModel,
} from '../utils/marketplace';

export interface CreateProviderServiceInput {
  category: ServiceCategory;
  titleFr: string;
  titleAr?: string;
  descriptionFr: string;
  descriptionAr?: string;
  pricingModel: ServicePricingModel;
  priceMad: number;
  calloutFeeMad: number;
  estimatedDurationMinutes: number;
}

function formatDate(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      return (ts as Timestamp).toDate().toISOString().slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export function useProviderServices(providerId: string | null | undefined, lang: LanguageCode) {
  const [services, setServices] = useState<ProviderServiceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!providerId) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'services'),
      where('providerId', '==', providerId),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ProviderServiceRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            providerId: String(data.providerId || providerId),
            category: (data.category as ServiceCategory) || 'Plomberie',
            titleFr: String(data.titleFr || ''),
            titleAr: String(data.titleAr || data.titleFr || ''),
            descriptionFr: String(data.descriptionFr || ''),
            descriptionAr: String(data.descriptionAr || data.descriptionFr || ''),
            pricingModel: (data.pricingModel as ServicePricingModel) || 'fixed',
            priceMad: Number(data.priceMad ?? 0),
            calloutFeeMad: Number(data.calloutFeeMad ?? 0),
            estimatedDurationMinutes: Number(data.estimatedDurationMinutes ?? 60),
            isActive: Boolean(data.isActive ?? true),
            createdAtIso: formatDate(data.createdAt),
          };
        });
        loaded.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
        setServices(loaded);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        reportFirestoreError(err, OperationType.LIST, `services?providerId=${providerId}`);
      }
    );

    return () => unsubscribe();
  }, [providerId]);

  const createService = useCallback(
    async (input: CreateProviderServiceInput): Promise<boolean> => {
      if (!providerId) return false;
      setError(null);
      const check = validateProviderServiceInput(input, lang);
      if (!check.valid) {
        setError(Object.values(check.errors)[0] || null);
        return false;
      }

      const randomHex =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
          : `${Date.now().toString(16)}`;
      const serviceId = `srv-${randomHex}`;
      const priceMad = input.pricingModel === 'quote_required' ? 0 : Math.round(input.priceMad);

      try {
        await setDoc(doc(db, 'services', serviceId), {
          providerId,
          category: input.category,
          titleFr: input.titleFr.trim().slice(0, 100),
          titleAr: (input.titleAr?.trim() || input.titleFr.trim()).slice(0, 100),
          descriptionFr: input.descriptionFr.trim().slice(0, 500),
          descriptionAr: (input.descriptionAr?.trim() || input.descriptionFr.trim()).slice(0, 500),
          pricingModel: input.pricingModel,
          priceMad,
          calloutFeeMad: Math.max(0, Math.round(input.calloutFeeMad)),
          estimatedDurationMinutes: Math.max(15, Math.min(1440, Math.round(input.estimatedDurationMinutes))),
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return true;
      } catch (err) {
        reportFirestoreError(err, OperationType.CREATE, `services/${serviceId}`);
        setError(
          lang === 'ar'
            ? 'تعذر حفظ الخدمة. تأكد من إكمال بطاقتك المهنية أولاً.'
            : 'Impossible de publier ce service. Vérifiez que votre Fiche Maâlem est enregistrée.'
        );
        return false;
      }
    },
    [providerId, lang]
  );

  const toggleServiceActive = useCallback(
    async (service: ProviderServiceRecord) => {
      try {
        await updateDoc(doc(db, 'services', service.id), {
          isActive: !service.isActive,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        reportFirestoreError(err, OperationType.UPDATE, `services/${service.id}`);
      }
    },
    []
  );

  const deleteService = useCallback(async (serviceId: string) => {
    try {
      await deleteDoc(doc(db, 'services', serviceId));
    } catch (err) {
      reportFirestoreError(err, OperationType.DELETE, `services/${serviceId}`);
    }
  }, []);

  return {
    services,
    loading,
    error,
    clearError: () => setError(null),
    createService,
    toggleServiceActive,
    deleteService,
  };
}
