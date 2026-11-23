import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
  Lock,
} from 'lucide-react';
import type {
  KycVerificationStatus,
  LanguageCode,
  ProviderKycDocumentRecord,
} from '../../utils/marketplace';

interface AdminKycReviewSectionProps {
  lang: LanguageCode;
  kycDocuments: ProviderKycDocumentRecord[];
  onLogDocumentViewed: (record: ProviderKycDocumentRecord, docLabel: string) => Promise<void>;
  onReviewKyc: (
    record: ProviderKycDocumentRecord,
    nextStatus: 'under_review' | 'verified' | 'rejected' | 'resubmission_required',
    rejectionReason?: string
  ) => Promise<void>;
}

function getKycBadge(status: KycVerificationStatus, isAr: boolean) {
  switch (status) {
    case 'verified':
      return {
        label: isAr ? 'موثق' : 'Vérifié',
        cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'under_review':
      return {
        label: isAr ? 'قيد المراجعة' : 'En cours d’examen',
        cls: 'bg-sky-50 text-sky-800 border-sky-200',
      };
    case 'rejected':
      return {
        label: isAr ? 'مرفوض' : 'Rejeté',
        cls: 'bg-rose-50 text-rose-800 border-rose-200',
      };
    case 'resubmission_required':
      return {
        label: isAr ? 'إعادة الإرسال مطلوبة' : 'Pièces à renvoyer',
        cls: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    default:
      return {
        label: isAr ? 'مُودع للتحقق' : 'Soumis',
        cls: 'bg-amber-50 text-amber-800 border-amber-200',
      };
  }
}

export const AdminKycReviewSection: React.FC<AdminKycReviewSectionProps> = ({
  lang,
  kycDocuments,
  onLogDocumentViewed,
  onReviewKyc,
}) => {
  const isAr = lang === 'ar';
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'verified' | 'rejected'>('ALL');
  const [reasonByUid, setReasonByUid] = useState<Record<string, string>>({});
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const filteredDocs = useMemo(() => {
    return kycDocuments.filter((doc) => {
      if (filter === 'ALL') return true;
      if (filter === 'PENDING') {
        return (
          doc.status === 'submitted' ||
          doc.status === 'under_review' ||
          doc.status === 'resubmission_required'
        );
      }
      return doc.status === filter;
    });
  }, [kycDocuments, filter]);

  const handleOpenAuditedDoc = async (
    record: ProviderKycDocumentRecord,
    docLabel: string,
    url: string
  ) => {
    await onLogDocumentViewed(record, docLabel);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDecision = async (
    record: ProviderKycDocumentRecord,
    nextStatus: 'under_review' | 'verified' | 'rejected' | 'resubmission_required'
  ) => {
    setBusyUid(record.uid);
    try {
      await onReviewKyc(record, nextStatus, reasonByUid[record.uid]);
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-950">
        <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">
            {isAr
              ? 'حماية المعطيات الشخصية (القانون 09-08 / CNDP): '
              : 'Conformité Loi 09-08 / CNDP : '}
          </span>
          <span>
            {isAr
              ? 'كل معاينة لوثائق البطاقة الوطنية أو الشهادات تُسجل تلقائياً في سجل التدقيق الأمني.'
              : 'Chaque consultation d’une pièce CIN ou d’un diplôme privé est automatiquement journalisée dans le journal d’audit.'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'ALL', fr: `Tous (${kycDocuments.length})`, ar: `الكل (${kycDocuments.length})` },
            { id: 'PENDING', fr: 'À vérifier', ar: 'في انتظار التحقق' },
            { id: 'verified', fr: 'Vérifiés', ar: 'موثقون' },
            { id: 'rejected', fr: 'Rejetés', ar: 'مرفوضون' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isAr ? tab.ar : tab.fr}
          </button>
        ))}
      </div>

      {filteredDocs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500 space-y-2">
          <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
          <p>
            {isAr
              ? 'لا توجد ملفات بطاقة وطنية في هذه الفئة حالياً.'
              : 'Aucun dossier KYC privé dans cette catégorie pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDocs.map((record) => {
            const badge = getKycBadge(record.status, isAr);
            const isBusy = busyUid === record.uid;
            const docLinks = [
              { label: isAr ? 'البطاقة الوطنية (الوجه)' : 'CIN Recto', url: record.cinFrontUrl },
              { label: isAr ? 'البطاقة الوطنية (الظهر)' : 'CIN Verso', url: record.cinBackUrl },
              ...(record.certificateUrl
                ? [{ label: isAr ? 'شهادة / دبلوم' : 'Diplôme / Certificat', url: record.certificateUrl }]
                : []),
              ...(record.businessLicenseUrl
                ? [{ label: isAr ? 'رخصة مهنية' : 'Patente / Licence', url: record.businessLicenseUrl }]
                : []),
            ];

            return (
              <div
                key={record.uid}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span className="text-sm font-bold text-slate-900 font-mono-tabular">
                        {record.cinNumberMasked}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">({record.uid})</span>
                    </div>
                    {record.submittedAtIso && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        {isAr ? 'تاريخ الإيداع: ' : 'Déposé le : '}
                        {record.submittedAtIso}
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Audited Private Document Viewer Links */}
                <div className="flex flex-wrap gap-2">
                  {docLinks.map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => {
                        void handleOpenAuditedDoc(record, d.label, d.url);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>

                {/* Rejection / Resubmission Note + Decision Controls */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <input
                    type="text"
                    value={reasonByUid[record.uid] ?? record.rejectionReason ?? ''}
                    onChange={(e) =>
                      setReasonByUid((prev) => ({ ...prev, [record.uid]: e.target.value }))
                    }
                    placeholder={
                      isAr
                        ? 'ملاحظة أو سبب الرفض / طلب إعادة الإرسال (اختياري)...'
                        : 'Motif de rejet ou commentaire de vérification (optionnel)...'
                    }
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        void handleDecision(record, 'verified');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'موافقة وتوثيق' : 'Approuver CIN'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        void handleDecision(record, 'resubmission_required');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isAr ? 'طلب إعادة إرسال' : 'Redemander'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        void handleDecision(record, 'rejected');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{isAr ? 'رفض' : 'Rejeter'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
