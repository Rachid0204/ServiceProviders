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
  maskMoroccanCin,
  type KycVerificationStatus,
  type LanguageCode,
  type ProviderKycDocumentRecord,
} from '../utils/marketplace';

export interface SubmitKycDossierInput {
  cinNumberRaw: string;
  cinFrontUrl: string;
  cinBackUrl: string;
  certificateUrl?: string;
  businessLicenseUrl?: string;
}

function formatDate(ts: unknown): string | undefined {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      return (ts as Timestamp).toDate().toISOString().slice(0, 10);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function useProviderVerification(uid: string | null | undefined, lang: LanguageCode) {
  const [kycDoc, setKycDoc] = useState<ProviderKycDocumentRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setKycDoc(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'providerDocuments', uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setKycDoc(null);
          setLoading(false);
          return;
        }
        const data = snap.data();
        setKycDoc({
          uid,
          cinNumberMasked: String(data.cinNumberMasked || ''),
          cinFrontUrl: String(data.cinFrontUrl || ''),
          cinBackUrl: String(data.cinBackUrl || ''),
          certificateUrl: data.certificateUrl ? String(data.certificateUrl) : undefined,
          businessLicenseUrl: data.businessLicenseUrl
            ? String(data.businessLicenseUrl)
            : undefined,
          status: (data.status as KycVerificationStatus) || 'submitted',
          rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined,
          reviewedByUid: data.reviewedByUid ? String(data.reviewedByUid) : undefined,
          submittedAtIso: formatDate(data.submittedAt),
          reviewedAtIso: formatDate(data.reviewedAt),
        });
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        reportFirestoreError(err, OperationType.GET, `providerDocuments/${uid}`);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const submitKycDossier = useCallback(
    async (input: SubmitKycDossierInput): Promise<boolean> => {
      if (!uid) return false;
      setError(null);
      const masked = maskMoroccanCin(input.cinNumberRaw);
      if (masked.length < 4) {
        setError(
          lang === 'ar'
            ? 'يرجى إدخال رقم البطاقة الوطنية (CIN) بشكل صحيح.'
            : 'Veuillez saisir un numéro CIN marocain valide (ex: BK123456).'
        );
        return false;
      }
      if (!input.cinFrontUrl.startsWith('https://') || !input.cinBackUrl.startsWith('https://')) {
        setError(
          lang === 'ar'
            ? 'يرجى رفع صورتي الواجهة الأمامية والخلفية للبطاقة الوطنية.'
            : 'Veuillez téléverser les justificatifs recto et verso de votre CIN.'
        );
        return false;
      }

      setSubmitting(true);
      try {
        const payload: Record<string, unknown> = {
          uid,
          cinNumberMasked: masked,
          cinFrontUrl: input.cinFrontUrl,
          cinBackUrl: input.cinBackUrl,
          status: 'submitted',
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (input.certificateUrl?.startsWith('https://')) {
          payload.certificateUrl = input.certificateUrl;
        }
        if (input.businessLicenseUrl?.startsWith('https://')) {
          payload.businessLicenseUrl = input.businessLicenseUrl;
        }

        await setDoc(doc(db, 'providerDocuments', uid), payload);
        return true;
      } catch (err) {
        reportFirestoreError(err, OperationType.WRITE, `providerDocuments/${uid}`);
        setError(
          lang === 'ar'
            ? 'تعذر إرسال ملف التوثيق حالياً. تأكد من تفعيل بريدك الإلكتروني.'
            : 'Impossible de soumettre votre dossier KYC. Vérifiez que votre e-mail est confirmé.'
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [uid, lang]
  );

  return {
    kycDoc,
    loading,
    submitting,
    error,
    clearError: () => setError(null),
    submitKycDossier,
  };
}
