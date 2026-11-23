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
  calculateEscrowSplit,
  canTransitionBookingStatus,
  formatMadCurrency,
  getTodayIsoDate,
  type BookingRecord,
  type LanguageCode,
  type TimeSlot,
  type UserRole,
} from '../utils/marketplace';
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
}) => {
  const isAr = lang === 'ar';

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
                {isAr ? 'تفاصيل الحجز والدفع' : 'Détail de la Réservation'}
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
              {isAr ? 'الخدمة والموقع' : 'Prestation & Localisation'}
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
              {isAr ? 'موعد التدخل' : 'Créneau planifié'}
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
                {isAr ? 'ملاحظة إعادة الجدولة: ' : 'Note de reprogrammation : '}
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
                {isAr ? 'سبب الإلغاء: ' : 'Motif d’annulation : '}
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
                {isAr
                  ? 'الدفع نقداً عند انتهاء الخدمة (0% عمولة)'
                  : 'Règlement Espèces fin de chantier (COD · 0% frais)'}
              </span>
            </div>
            <span className="font-mono-tabular font-bold text-sm text-slate-900">
              {formatMadCurrency(booking.estimatedMad, lang)}
            </span>
          </div>
        </div>

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
                <span>{isAr ? 'إعادة الجدولة' : 'Reprogrammer'}</span>
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

          <div className="flex items-center gap-2">
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
        isAr ? 'تعذر إلغاء الحجز. حاول مرة أخرى.' : 'Impossible d’annuler la réservation.'
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
              {isAr ? 'تأكيد إلغاء الحجز' : 'Confirmer l’annulation de la réservation'}
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
              {isAr ? 'سبب الإلغاء' : 'Motif principal d’annulation'}
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
              {isAr ? 'توضيح إضافي (اختياري)' : 'Précision complémentaire (optionnel)'}
            </label>
            <textarea
              id="cancel-custom-note"
              rows={2}
              maxLength={300}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder={
                isAr
                  ? 'أضف ملاحظة للمعلم أو الزبون...'
                  : 'Ajoutez une note pour le dossier...'
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
                {isAr ? 'تأكيد الإلغاء' : 'Confirmer l’annulation'}
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
        isAr ? 'يرجى اختيار تاريخ صالح.' : 'Veuillez choisir une date égale ou ultérieure à aujourd’hui.'
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirmReschedule(booking.id, newDate, newSlot, note);
      onClose();
    } catch {
      setSubmitError(
        isAr ? 'تعذر حفظ الموعد الجديد.' : 'Impossible de reprogrammer ce créneau.'
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
              {isAr ? 'إعادة جدولة موعد التدخل' : 'Reprogrammer le créneau d’intervention'}
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
              {isAr ? 'ملاحظة حول الموعد الجديد' : 'Note de reprogrammation'}
            </label>
            <input
              id="reschedule-note"
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: تأجيل بطلب من الزبون إلى الفترة المسائية'
                  : 'Ex: Décalé à l’après-midi en accord avec le Maâlem'
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
              <span>{isAr ? 'حفظ الموعد الجديد' : 'Enregistrer le créneau'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
