import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Scale,
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  ShieldCheck,
} from 'lucide-react';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import {
  DISPUTE_REASONS,
  type DisputeReason,
  type DisputeStatus,
} from '../../utils/marketplace';
import { uploadMarketplacePhoto } from '../../utils/storageUpload';

function getDisputeStatusStyle(status: DisputeStatus, isAr: boolean) {
  switch (status) {
    case 'open':
      return {
        label: isAr ? 'مفتوح' : 'Ouvert',
        cls: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'under_review':
      return {
        label: isAr ? 'قيد الدراسة' : 'En cours d’examen',
        cls: 'bg-sky-50 text-sky-800 border-sky-200',
      };
    case 'waiting_for_client':
      return {
        label: isAr ? 'في انتظار رد الزبون' : 'En attente du client',
        cls: 'bg-purple-50 text-purple-800 border-purple-200',
      };
    case 'waiting_for_provider':
      return {
        label: isAr ? 'في انتظار رد المعلم' : 'En attente du Maâlem',
        cls: 'bg-purple-50 text-purple-800 border-purple-200',
      };
    case 'resolved':
      return {
        label: isAr ? 'تم الحل' : 'Résolu',
        cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'closed':
      return {
        label: isAr ? 'مغلق' : 'Clôturé',
        cls: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
}

function getReasonLabel(reason: DisputeReason, isAr: boolean): string {
  switch (reason) {
    case 'quality_issue':
      return isAr ? 'جودة العمل غير مطابقة' : 'Qualité du travail non conforme';
    case 'no_show':
      return isAr ? 'عدم الحضور في الموعد' : 'Absence au rendez-vous (No-show)';
    case 'pricing_mismatch':
      return isAr ? 'اختلاف في التسعيرة المتفق عليها' : 'Écart par rapport au devis / tarif convenu';
    case 'property_damage':
      return isAr ? 'ضرر مادي أثناء التدخل' : 'Dommage matériel constaté';
    case 'payment_issue':
      return isAr ? 'مشكل في الأداء أو الوصل' : 'Incident de règlement ou reçu';
    default:
      return isAr ? 'سبب آخر' : 'Autre motif';
  }
}

export const DisputesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedBookingId = searchParams.get('bookingId') ?? '';

  const { lang, t, isAr, firebaseUser, bookings, disputes, openDispute } = useMarketplace();

  const eligibleBookings = useMemo(
    () => bookings.filter((b) => !b.id.startsWith('booking-demo-')),
    [bookings]
  );

  const [selectedBookingId, setSelectedBookingId] = useState(preselectedBookingId);
  const [reason, setReason] = useState<DisputeReason>('quality_issue');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedBookingId) {
      setSelectedBookingId(preselectedBookingId);
    } else if (!selectedBookingId && eligibleBookings.length > 0) {
      setSelectedBookingId(eligibleBookings[0].id);
    }
  }, [preselectedBookingId, eligibleBookings, selectedBookingId]);

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || evidenceUrls.length >= 4) return;
    setErrorMsg(null);
    setIsUploading(true);
    try {
      const result = await uploadMarketplacePhoto({
        file,
        scope: 'disputes',
        entityId: selectedBookingId || `draft-${Date.now()}`,
        userId: firebaseUser?.uid ?? null,
        lang,
      });
      setEvidenceUrls((prev) => [...prev, result.url].slice(0, 4));
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isAr
          ? 'تعذر رفع الدليل.'
          : 'Impossible de téléverser le justificatif.'
      );
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const booking = eligibleBookings.find((b) => b.id === selectedBookingId);
    if (!booking) {
      setErrorMsg(
        isAr ? 'يرجى اختيار حجز صالح.' : 'Veuillez sélectionner une réservation existante.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await openDispute({
        booking,
        reason,
        description,
        evidenceUrls,
      });
      setDescription('');
      setEvidenceUrls([]);
      setSuccessMsg(t.disputesSuccessNotice);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isAr
          ? 'تعذر إرسال ملف النزاع.'
          : 'Impossible d’ouvrir le litige.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.disputesTitle}</h1>
        <p className="text-sm text-slate-600 mt-1">{t.disputesSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Open New Dispute Form */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">{t.disputesOpenBtn}</h2>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isAr ? 'الحجز المعني' : 'Réservation concernée'}
              </label>
              <select
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                disabled={eligibleBookings.length === 0}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
              >
                {eligibleBookings.length === 0 ? (
                  <option value="">
                    {isAr ? 'لا توجد حجوزات مؤهلة' : 'Aucune réservation disponible'}
                  </option>
                ) : (
                  eligibleBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      #{b.bookingRef} — {b.serviceType} ({b.preferredDate})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isAr ? 'سبب النزاع' : 'Motif du litige'}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as DisputeReason)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {DISPUTE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {getReasonLabel(r, isAr)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isAr ? 'وصف تفصيلي للواقعة' : 'Description détaillée'}
              </label>
              <textarea
                rows={4}
                required
                minLength={15}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isAr
                    ? 'اشرح بالتفصيل ما حدث مع ذكر التواريخ والتفاصيل...'
                    : 'Expliquez précisément la situation (dates, travaux constatés, écarts éventuels)...'
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  {t.disputesEvidenceLabel}
                </span>
                <label
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer ${
                    isUploading || evidenceUrls.length >= 4 ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{isUploading ? '...' : isAr ? 'إضافة صورة' : 'Joindre photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      void handleEvidenceUpload(e);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {evidenceUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {evidenceUrls.map((url, idx) => (
                    <div key={url} className="relative">
                      <img
                        src={url}
                        alt={`Preuve ${idx + 1}`}
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setEvidenceUrls((prev) => prev.filter((u) => u !== url))}
                        aria-label={t.removePhotoBtn}
                        className="absolute -top-1.5 -end-1.5 p-0.5 rounded-full bg-rose-600 text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isUploading || eligibleBookings.length === 0}
              className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t.disputesSubmitBtn}
            </button>
          </form>
        </section>

        {/* Right: User's Disputes History */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">
              {isAr ? 'ملفات النزاع الخاصة بي' : 'Mes dossiers de médiation'} ({disputes.length})
            </span>
          </div>

          {disputes.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-200 mx-auto" />
              <p className="text-sm text-slate-500">{t.disputesEmpty}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {disputes.map((d) => {
                const st = getDisputeStatusStyle(d.status, isAr);
                return (
                  <li key={d.id} className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileWarning className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-sm font-bold text-slate-900">
                          #{d.bookingRef} · {getReasonLabel(d.reason, isAr)}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {d.description}
                    </p>

                    {d.evidenceUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {d.evidenceUrls.map((url, idx) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={url}
                              alt={`Justificatif ${idx + 1}`}
                              className="w-16 h-16 rounded-lg object-cover border border-slate-200 hover:opacity-90"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {d.resolutionSummary && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                        <span className="font-semibold">
                          {isAr ? 'قرار الوساطة: ' : 'Décision de médiation : '}
                        </span>
                        <span>{d.resolutionSummary}</span>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400">
                      {d.createdAtIso.slice(0, 10)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
