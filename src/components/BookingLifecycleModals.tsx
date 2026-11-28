import { uiText } from '../i18n/uiCopy';
import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Banknote,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Star,
  RefreshCw,
  Download,
  Scale,
} from 'lucide-react';
import {
  TIME_SLOTS,
  canTransitionBookingStatus,
  formatMadCurrency,
  getTodayIsoDate,
  type BookingRecord,
  type LanguageCode,
  type TimeSlot,
  type UserRole,
} from '../utils/marketplace';
import {
  validateRevisedQuoteInput,
  type RevisedQuoteInput,
} from '../utils/bookingLogic';
import { downloadBookingReceipt } from '../utils/paymentsAdapter';
import type { Translations } from '../i18n/translations';
import { BookingTimeline } from './BookingTimeline';

interface BookingDetailModalProps {
  booking: BookingRecord;
  lang: LanguageCode;
  t: Translations;
  activeRole: UserRole;
  platformFeePct?: number;
  onClose: () => void;
  onOpenChat: (booking: BookingRecord) => void;
  onOpenReschedule: (booking: BookingRecord) => void;
  onOpenCancel: (booking: BookingRecord) => void;
  onOpenReview: (booking: BookingRecord) => void;
  onOpenDispute?: (booking: BookingRecord) => void;
  onConfirmAndReleaseEscrow: (bookingId: string) => Promise<void>;
  onSubmitRevisedQuote?: (bookingId: string, input: RevisedQuoteInput) => Promise<void>;
  onRespondToRevisedQuote?: (
    bookingId: string,
    decision: 'approved' | 'declined'
  ) => Promise<void>;
  onRebookProvider?: (booking: BookingRecord) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  lang,
  t,
  activeRole,
  platformFeePct = 0,
  onClose,
  onOpenChat,
  onOpenReschedule,
  onOpenCancel,
  onOpenReview,
  onOpenDispute,
  onConfirmAndReleaseEscrow: _onConfirmAndReleaseEscrow,
  onSubmitRevisedQuote,
  onRespondToRevisedQuote,
  onRebookProvider,
}) => {
  const isAr = lang === 'ar';
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [laborMadInput, setLaborMadInput] = useState<string>(
    String(booking.revisedQuote?.laborMad ?? booking.estimatedMad)
  );
  const [materialsMadInput, setMaterialsMadInput] = useState<string>(
    String(booking.revisedQuote?.materialsMad ?? 0)
  );
  const [quoteNoteInput, setQuoteNoteInput] = useState<string>(booking.revisedQuote?.note ?? '');
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null);
  const [isQuoteSubmitting, setIsQuoteSubmitting] = useState(false);

  const canProviderProposeQuote =
    activeRole === 'provider' &&
    booking.status === 'accepted' &&
    Boolean(onSubmitRevisedQuote) &&
    (!booking.revisedQuote || booking.revisedQuote.status === 'declined');

  const canClientRespondQuote =
    activeRole !== 'provider' &&
    booking.status === 'accepted' &&
    booking.revisedQuote?.status === 'pending' &&
    Boolean(onRespondToRevisedQuote);

  const proposedTotalPreview =
    Math.max(0, Math.round(Number(laborMadInput) || 0)) +
    Math.max(0, Math.round(Number(materialsMadInput) || 0));

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitRevisedQuote) return;
    setQuoteError(null);
    setQuoteSuccess(null);
    const parsedInput: RevisedQuoteInput = {
      laborMad: Number(laborMadInput) || 0,
      materialsMad: Number(materialsMadInput) || 0,
      note: quoteNoteInput,
    };
    const validation = validateRevisedQuoteInput(parsedInput, lang);
    if (!validation.valid) {
      setQuoteError(validation.error ?? uiText(isAr).booking.impossibleDeReprogrammerCeCreneau);
      return;
    }
    setIsQuoteSubmitting(true);
    try {
      await onSubmitRevisedQuote(booking.id, parsedInput);
      setQuoteSuccess(uiText(isAr).booking.revisedQuoteSentSuccess);
      setShowQuoteForm(false);
    } catch (err) {
      setQuoteError(
        err instanceof Error && err.message
          ? err.message
          : uiText(isAr).booking.impossibleDeReprogrammerCeCreneau
      );
    } finally {
      setIsQuoteSubmitting(false);
    }
  };

  const handleRespondQuote = async (decision: 'approved' | 'declined') => {
    if (!onRespondToRevisedQuote) return;
    setQuoteError(null);
    setIsQuoteSubmitting(true);
    try {
      await onRespondToRevisedQuote(booking.id, decision);
    } catch (err) {
      setQuoteError(
        err instanceof Error && err.message
          ? err.message
          : uiText(isAr).booking.impossibleDeReprogrammerCeCreneau
      );
    } finally {
      setIsQuoteSubmitting(false);
    }
  };

  const canReschedule =
    booking.status === 'pending' || booking.status === 'accepted';

  const effectiveActor: 'client' | 'provider' =
    activeRole === 'provider' ? 'provider' : 'client';
  const canCancel = canTransitionBookingStatus(
    booking.status,
    'cancelled',
    effectiveActor
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="booking-detail-title" className="text-base font-bold text-slate-900">
                {uiText(isAr).booking.detailDeLaReservation}
              </h2>
              <span className="text-xs font-mono-tabular font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                #{booking.bookingRef}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {booking.clientName} → {booking.providerName} · {t.categories[booking.category]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Service & Schedule Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="text-slate-500 font-medium">
              {uiText(isAr).booking.prestationLocalisation}
            </div>
            <div className="font-bold text-slate-900">{booking.serviceType}</div>
            <div className="text-slate-600 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {t.cities[booking.city]} · {booking.neighborhood}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="text-slate-500 font-medium">
              {uiText(isAr).booking.creneauPlanifie}
            </div>
            <div className="font-mono-tabular font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>{booking.preferredDate}</span>
            </div>
            <div className="font-mono-tabular text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{booking.preferredTimeSlot}</span>
            </div>
          </div>
        </div>

        {/* Visual Request & Booking Status Timeline */}
        <BookingTimeline booking={booking} lang={lang} t={t} />

        {booking.rescheduleNote && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
            <RefreshCw className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                {uiText(isAr).booking.noteDeReprogrammation}
              </span>
              <span>{booking.rescheduleNote}</span>
            </div>
          </div>
        )}

        {booking.cancellationReason && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
            <XCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                {uiText(isAr).booking.motifDAnnulation}
              </span>
              <span>{booking.cancellationReason}</span>
            </div>
          </div>
        )}

        {/* Cash on Completion Financial Summary Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span>
                {uiText(isAr).booking.reglementEspecesFinDeChantierCod}
              </span>
            </div>
            <span className="font-mono-tabular font-bold text-sm text-slate-900">
              {formatMadCurrency(booking.estimatedMad, lang)}
            </span>
          </div>
        </div>

        {/* Post-Visit On-Site Revised Quote Section */}
        {booking.revisedQuote && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2.5 ${
              booking.revisedQuote.status === 'pending'
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : booking.revisedQuote.status === 'approved'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">
                {booking.revisedQuote.status === 'pending'
                  ? uiText(isAr).booking.revisedQuotePendingClient
                  : booking.revisedQuote.status === 'approved'
                  ? uiText(isAr).booking.revisedQuoteApprovedBadge
                  : uiText(isAr).booking.revisedQuoteDeclinedBadge}
              </span>
              <span className="font-mono-tabular font-bold text-sm">
                {formatMadCurrency(booking.revisedQuote.totalMad, lang)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/70 rounded-lg p-2.5 border border-black/5">
              <div>
                <span className="text-slate-500 block">
                  {uiText(isAr).booking.revisedQuoteLaborLabel}
                </span>
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {formatMadCurrency(booking.revisedQuote.laborMad, lang)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">
                  {uiText(isAr).booking.revisedQuoteMaterialsLabel}
                </span>
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {formatMadCurrency(booking.revisedQuote.materialsMad, lang)}
                </span>
              </div>
            </div>

            {booking.revisedQuote.note && (
              <p className="text-xs leading-relaxed opacity-90">{booking.revisedQuote.note}</p>
            )}

            {canClientRespondQuote && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isQuoteSubmitting}
                  onClick={() => {
                    void handleRespondQuote('approved');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{uiText(isAr).booking.revisedQuoteApproveBtn}</span>
                </button>
                <button
                  type="button"
                  disabled={isQuoteSubmitting}
                  onClick={() => {
                    void handleRespondQuote('declined');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg disabled:opacity-60 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{uiText(isAr).booking.revisedQuoteDeclineBtn}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {quoteSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium">
            {quoteSuccess}
          </div>
        )}

        {quoteError && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
            {quoteError}
          </div>
        )}

        {canProviderProposeQuote && (
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">
                {uiText(isAr).booking.revisedQuoteTitle}
              </span>
              {!showQuoteForm && (
                <button
                  type="button"
                  onClick={() => setShowQuoteForm(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
                >
                  {uiText(isAr).booking.revisedQuoteProposeBtn}
                </button>
              )}
            </div>

            {showQuoteForm && (
              <form onSubmit={handleSubmitQuote} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="revised-quote-labor"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      {uiText(isAr).booking.revisedQuoteLaborLabel}
                    </label>
                    <input
                      id="revised-quote-labor"
                      type="number"
                      min={0}
                      max={100000}
                      value={laborMadInput}
                      onChange={(e) => setLaborMadInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="revised-quote-materials"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      {uiText(isAr).booking.revisedQuoteMaterialsLabel}
                    </label>
                    <input
                      id="revised-quote-materials"
                      type="number"
                      min={0}
                      max={100000}
                      value={materialsMadInput}
                      onChange={(e) => setMaterialsMadInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="revised-quote-note"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    {uiText(isAr).booking.revisedQuoteNoteLabel}
                  </label>
                  <textarea
                    id="revised-quote-note"
                    rows={2}
                    maxLength={400}
                    value={quoteNoteInput}
                    onChange={(e) => setQuoteNoteInput(e.target.value)}
                    placeholder={uiText(isAr).booking.revisedQuoteNotePlaceholder}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-xs text-slate-700">
                    <span>{uiText(isAr).booking.revisedQuoteTotalLabel}: </span>
                    <strong className="font-mono-tabular text-emerald-800">
                      {formatMadCurrency(proposedTotalPreview, lang)}
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuoteForm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      {t.closeBtn}
                    </button>
                    <button
                      type="submit"
                      disabled={isQuoteSubmitting}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-60 cursor-pointer"
                    >
                      {uiText(isAr).booking.revisedQuoteSubmitBtn}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenChat(booking);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t.openChatBtn}</span>
            </button>

            {canReschedule && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReschedule(booking);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{uiText(isAr).booking.reprogrammer}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                downloadBookingReceipt(booking, lang, platformFeePct);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t.downloadReceiptBtn}</span>
            </button>

            {onOpenDispute && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDispute(booking);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{t.openDisputeBtn}</span>
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCancel(booking);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{t.cancelRequestBtn}</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(booking.status === 'completed' || booking.status === 'reviewed') &&
              activeRole !== 'provider' &&
              onRebookProvider && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRebookProvider(booking);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{uiText(isAr).booking.rebookProviderBtn}</span>
                </button>
              )}
            {booking.status === 'completed' && activeRole !== 'provider' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReview(booking);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-lg cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-slate-900" />
                <span>{t.leaveReviewBtn}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CancellationModalProps {
  booking: BookingRecord;
  lang: LanguageCode;
  t: Translations;
  actorRole: UserRole;
  onClose: () => void;
  onConfirmCancel: (bookingId: string, reason: string, actorRole: UserRole) => Promise<void>;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
  booking,
  lang,
  t,
  actorRole,
  onClose,
  onConfirmCancel,
}) => {
  const isAr = lang === 'ar';
  const presetReasons = isAr
    ? [
        'تغيير في الموعد أو ظروف طارئة',
        'عدم توفر المعلم في الفترة المطلوبة',
        'تم حل المشكل التقني مسبقاً',
      ]
    : [
        'Contretemps ou changement de créneau',
        'Indisponibilité du Maâlem sur ce créneau',
        'Problème technique résolu entre-temps',
      ];

  const [selectedPreset, setSelectedPreset] = useState<string>(presetReasons[0]);
  const [customNote, setCustomNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const fullReason = customNote.trim()
        ? `${selectedPreset} — ${customNote.trim()}`
        : selectedPreset;
      await onConfirmCancel(booking.id, fullReason, actorRole);
      onClose();
    } catch {
      setSubmitError(
        uiText(isAr).booking.impossibleDAnnulerLaReservation
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 id="cancel-modal-title" className="text-base font-bold text-slate-900">
              {uiText(isAr).booking.confirmerLAnnulationDeLaReservation}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              #{booking.bookingRef} · {booking.providerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              {uiText(isAr).booking.motifPrincipalDAnnulation}
            </label>
            {presetReasons.map((reason) => (
              <label
                key={reason}
                className="flex items-center gap-2.5 p-2.5 border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  checked={selectedPreset === reason}
                  onChange={() => setSelectedPreset(reason)}
                  className="text-emerald-700 focus:ring-emerald-600"
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>

          <div>
            <label
              htmlFor="cancel-custom-note"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {uiText(isAr).booking.precisionComplementaireOptionnel}
            </label>
            <textarea
              id="cancel-custom-note"
              rows={2}
              maxLength={300}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder={
                uiText(isAr).booking.ajoutezUneNotePourLeDossier
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {submitError && (
            <div role="alert" className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              {t.closeBtn}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-700 rounded-lg hover:bg-rose-800 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>
                {uiText(isAr).booking.confirmerLAnnulation}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RescheduleModalProps {
  booking: BookingRecord;
  lang: LanguageCode;
  t: Translations;
  onClose: () => void;
  onConfirmReschedule: (
    bookingId: string,
    newDate: string,
    newSlot: TimeSlot,
    note: string
  ) => Promise<void>;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  booking,
  lang,
  t,
  onClose,
  onConfirmReschedule,
}) => {
  const isAr = lang === 'ar';
  const todayIso = getTodayIsoDate();
  const [newDate, setNewDate] = useState<string>(
    booking.preferredDate >= todayIso ? booking.preferredDate : todayIso
  );
  const [newSlot, setNewSlot] = useState<TimeSlot>(booking.preferredTimeSlot);
  const [note, setNote] = useState<string>(booking.rescheduleNote ?? '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!newDate || newDate < todayIso) {
      setSubmitError(
        uiText(isAr).booking.veuillezChoisirUneDateEgaleOu2
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirmReschedule(booking.id, newDate, newSlot, note);
      onClose();
    } catch {
      setSubmitError(
        uiText(isAr).booking.impossibleDeReprogrammerCeCreneau
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 id="reschedule-modal-title" className="text-base font-bold text-slate-900">
              {uiText(isAr).booking.reprogrammerLeCreneauDIntervention}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              #{booking.bookingRef} · {booking.providerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reschedule-date"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t.preferredDateLabel}
            </label>
            <input
              id="reschedule-date"
              type="date"
              min={todayIso}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.preferredTimeSlotLabel}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setNewSlot(slot)}
                  className={`px-2 py-2 text-xs font-mono-tabular font-semibold rounded-lg border transition-colors cursor-pointer ${
                    newSlot === slot
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {slot.replace(' - ', '–')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="reschedule-note"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {uiText(isAr).booking.noteDeReprogrammation2}
            </label>
            <input
              id="reschedule-note"
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                uiText(isAr).booking.exDecaleALApresMidi
              }
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {submitError && (
            <div role="alert" className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              {t.closeBtn}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{uiText(isAr).booking.enregistrerLeCreneau}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
