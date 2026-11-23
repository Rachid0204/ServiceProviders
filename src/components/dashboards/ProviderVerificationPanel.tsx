import { uiText } from '../../i18n/uiCopy';
import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Upload,
  FileCheck2,
  Lock,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { LanguageCode } from '../../utils/marketplace';
import {
  uploadPrivateKycDocument,
  type KycDocumentKind,
} from '../../utils/storageUpload';
import { useProviderVerification } from '../../hooks/useProviderVerification';

interface ProviderVerificationPanelProps {
  uid: string;
  isVerifiedBadge: boolean;
  lang: LanguageCode;
}

export const ProviderVerificationPanel: React.FC<ProviderVerificationPanelProps> = ({
  uid,
  isVerifiedBadge,
  lang,
}) => {
  const isAr = lang === 'ar';
  const { kycDoc, loading, submitting, error, clearError, submitKycDossier } =
    useProviderVerification(uid, lang);

  const [cinRaw, setCinRaw] = useState('');
  const [cinFrontUrl, setCinFrontUrl] = useState('');
  const [cinBackUrl, setCinBackUrl] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [uploadingKind, setUploadingKind] = useState<KycDocumentKind | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const effectiveFrontUrl = cinFrontUrl || kycDoc?.cinFrontUrl || '';
  const effectiveBackUrl = cinBackUrl || kycDoc?.cinBackUrl || '';
  const effectiveCertUrl = certificateUrl || kycDoc?.certificateUrl || '';

  const handleFileChange = async (
    kind: KycDocumentKind,
    file: File | null | undefined
  ) => {
    if (!file) return;
    setUploadError(null);
    setSuccessMsg(null);
    setUploadingKind(kind);
    try {
      const { url } = await uploadPrivateKycDocument({
        file,
        userId: uid,
        docType: kind,
        lang,
      });
      if (kind === 'cin_front') setCinFrontUrl(url);
      else if (kind === 'cin_back') setCinBackUrl(url);
      else if (kind === 'certificate') setCertificateUrl(url);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : uiText(isAr).provider.erreurLorsDuTeleversementDuJustificatif
      );
    } finally {
      setUploadingKind(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setUploadError(null);
    setSuccessMsg(null);
    const ok = await submitKycDossier({
      cinNumberRaw: cinRaw || kycDoc?.cinNumberMasked || '',
      cinFrontUrl: effectiveFrontUrl,
      cinBackUrl: effectiveBackUrl,
      certificateUrl: effectiveCertUrl || undefined,
    });
    if (ok) {
      setSuccessMsg(
        uiText(isAr).provider.dossierCinEnvoyeAvecSuccesNotre
      );
    }
  };

  const status = isVerifiedBadge ? 'verified' : kycDoc?.status || 'not_submitted';

  const statusConfig = {
    verified: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: ShieldCheck,
      label: uiText(isAr).provider.identiteVerifieeBadgeCinActif,
    },
    submitted: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: Clock,
      label: uiText(isAr).provider.dossierSoumisEnCoursDeVerification,
    },
    under_review: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: Clock,
      label: uiText(isAr).provider.enCoursDExamenParUn,
    },
    rejected: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: ShieldAlert,
      label: uiText(isAr).provider.dossierRefuseResoumissionRequise,
    },
    resubmission_required: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: ShieldAlert,
      label: uiText(isAr).provider.piecesComplementairesDemandees,
    },
    not_submitted: {
      bg: 'bg-slate-50 border-slate-200 text-slate-800',
      icon: ShieldAlert,
      label: uiText(isAr).provider.verificationCinNonSoumise,
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Current Verification Status Banner */}
      <div className={`p-5 rounded-2xl border flex items-start gap-3 ${statusConfig.bg}`}>
        <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-bold text-sm">{statusConfig.label}</div>
          {kycDoc?.cinNumberMasked && (
            <div>
              {uiText(isAr).provider.numeroCinMasque} <strong>{kycDoc.cinNumberMasked}</strong>
            </div>
          )}
          {kycDoc?.rejectionReason && (
            <p className="font-semibold text-rose-800">
              {uiText(isAr).provider.motif} {kycDoc.rejectionReason}
            </p>
          )}
        </div>
      </div>

      {/* Law 09-08 Privacy Guarantee */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs flex items-start gap-3">
        <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {uiText(isAr).provider.confidentialiteLoi0908CndpVos}
        </p>
      </div>

      {/* Upload Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
      >
        <h2 className="text-base font-bold text-slate-900">
          {uiText(isAr).provider.deposerMesJustificatifsDeVerification}
        </h2>

        {(error || uploadError) && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error || uploadError}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <p className="text-xs text-slate-500">{uiText(isAr).provider.chargement}</p>
        ) : (
          <>
            <div className="space-y-1">
              <label htmlFor="kyc-cin" className="block text-xs font-semibold text-slate-700">
                {uiText(isAr).provider.numeroDeCarteNationaleCin}
              </label>
              <input
                id="kyc-cin"
                type="text"
                dir="ltr"
                required={!kycDoc?.cinNumberMasked}
                value={cinRaw}
                onChange={(e) => setCinRaw(e.target.value)}
                placeholder={kycDoc?.cinNumberMasked || 'Ex: BK123456'}
                className="w-full max-w-sm px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
              <p className="text-[11px] text-slate-500">
                {uiText(isAr).provider.stockeSousFormeMasqueeDansVotre}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  {
                    kind: 'cin_front' as const,
                    label: uiText(isAr).provider.cinRectoFaceAvant,
                    uploaded: Boolean(effectiveFrontUrl),
                  },
                  {
                    kind: 'cin_back' as const,
                    label: uiText(isAr).provider.cinVersoFaceArriere,
                    uploaded: Boolean(effectiveBackUrl),
                  },
                  {
                    kind: 'certificate' as const,
                    label: uiText(isAr).provider.diplomeCertificatOptionnel,
                    uploaded: Boolean(effectiveCertUrl),
                  },
                ] as const
              ).map(({ kind, label, uploaded }) => (
                <label
                  key={kind}
                  className={`p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors ${
                    uploaded
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50 hover:border-emerald-400'
                  }`}
                >
                  {uploaded ? (
                    <FileCheck2 className="w-6 h-6 text-emerald-700" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-400" />
                  )}
                  <span className="text-xs font-semibold text-slate-800">{label}</span>
                  <span className="text-[11px] text-slate-500">
                    {uploadingKind === kind
                      ? uiText(isAr).provider.televersement
                      : uploaded
                      ? uiText(isAr).provider.fichierEnregistreCliquerPourRemplacer
                      : 'JPG, PNG, WebP ou PDF (max 8 Mo)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={uploadingKind !== null}
                    onChange={(e) => {
                      void handleFileChange(kind, e.target.files?.[0]);
                    }}
                  />
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting || uploadingKind !== null || !effectiveFrontUrl || !effectiveBackUrl}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {submitting
                  ? uiText(isAr).provider.envoiEnCours
                  : uiText(isAr).provider.soumettreMonDossierPourVerification}
              </span>
            </button>
          </>
        )}
      </form>
    </div>
  );
};
