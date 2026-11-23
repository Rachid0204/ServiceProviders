import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Phone,
  MapPin,
  Clock,
  Camera,
  CreditCard,
  Banknote,
  MessageCircle,
  Navigation,
  LogIn,
} from 'lucide-react';
import {
  TIME_SLOTS,
  formatMadCurrency,
  validateServiceRequestInput,
  buildWhatsAppUrl,
  generateBookingIds,
  getTodayIsoDate,
  type LanguageCode,
  type UserProfileRecord,
  type VettedProvider,
  type TimeSlot,
  type PaymentMethod,
} from '../utils/marketplace';
import type { User } from 'firebase/auth';
import type { Translations } from '../i18n/translations';
import { uploadMarketplacePhoto, revokePreviewObjectUrl } from '../utils/storageUpload';
import {
  getBookingSubmissionMode,
  mapFirebaseAuthError,
  mapProfileSaveError,
} from '../utils/authHelpers';

interface BookingModalProps {
  provider: VettedProvider;
  lang: LanguageCode;
  t: Translations;
  firebaseUser?: User | null;
  currentProfile: UserProfileRecord | null;
  onGoogleSignIn?: () => Promise<void>;
  onOpenAuthModal?: () => void;
  onClose: () => void;
  onSubmitBooking: (payload: {
    bookingId?: string;
    bookingRef?: string;
    provider: VettedProvider;
    clientName: string;
    clientPhone: string;
    serviceType: string;
    neighborhood: string;
    addressPin: string;
    description: string;
    problemPhotoUrl?: string;
    preferredDate: string;
    preferredTimeSlot: TimeSlot;
    paymentMethod: PaymentMethod;
    estimatedMad: number;
  }) => Promise<string>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  provider,
  lang,
  t,
  firebaseUser = null,
  currentProfile,
  onGoogleSignIn,
  onOpenAuthModal,
  onClose,
  onSubmitBooking,
}) => {
  const availableServices =
    lang === 'ar' && provider.skillsAr.length > 0 ? provider.skillsAr : provider.skills;
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const preGeneratedIds = useMemo(() => generateBookingIds(), [provider.id]);
  const submissionMode = getBookingSubmissionMode(firebaseUser);

  const [clientName, setClientName] = useState(
    currentProfile?.fullName ?? firebaseUser?.displayName ?? ''
  );
  const [clientPhone, setClientPhone] = useState(currentProfile?.phone ?? '+2126');
  const [serviceType, setServiceType] = useState<string>(
    availableServices[0] || t.categories[provider.category]
  );
  const [neighborhood, setNeighborhood] = useState(
    currentProfile?.neighborhood ?? provider.location.quartier
  );
  const [addressPin, setAddressPin] = useState(
    `${currentProfile?.neighborhood || provider.location.quartier}, ${provider.location.city}`
  );
  const [description, setDescription] = useState('');
  const [problemPhotoUrl, setProblemPhotoUrl] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState(todayIso);
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<TimeSlot>('09:00 - 12:00');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_completion');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSigningInInline, setIsSigningInInline] = useState(false);
  const [isLocatingPin, setIsLocatingPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const submittingLockRef = React.useRef(false);

  useEffect(() => {
    if (currentProfile) {
      setClientName((prev) => prev || currentProfile.fullName);
      setClientPhone((prev) => (prev === '+2126' || !prev ? currentProfile.phone : prev));
      setNeighborhood((prev) => prev || currentProfile.neighborhood);
    } else if (firebaseUser?.displayName) {
      setClientName((prev) => prev || firebaseUser.displayName || '');
    }
  }, [currentProfile, firebaseUser?.displayName]);

  useEffect(() => {
    return () => {
      revokePreviewObjectUrl(problemPhotoUrl);
    };
  }, [problemPhotoUrl]);

  const estimatedMad = provider.fixedVisitFeeMAD + provider.hourlyRateMAD;
  const providerDisplayName = lang === 'ar' ? provider.fullNameAr : provider.fullNameFr;

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setIsUploadingPhoto(true);
    try {
      const result = await uploadMarketplacePhoto({
        file,
        scope: 'bookings',
        entityId: preGeneratedIds.bookingId,
        userId: firebaseUser?.uid ?? null,
        lang,
      });
      setProblemPhotoUrl((prev) => {
        revokePreviewObjectUrl(prev);
        return result.url;
      });
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : lang === 'ar'
          ? 'تعذر رفع الصورة.'
          : 'Impossible de téléverser la photo.'
      );
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleInsertGpsPin = () => {
    const fallbackPin = () => {
      setAddressPin(
        `${neighborhood || provider.location.quartier}, ${provider.location.city} — ${
          lang === 'ar' ? 'العنوان بالتقريب' : 'Repère quartier'
        }`
      );
    };

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsLocatingPin(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocatingPin(false);
          setAddressPin(
            `${neighborhood || provider.location.quartier}, ${provider.location.city} — GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
          );
        },
        () => {
          setIsLocatingPin(false);
          fallbackPin();
        },
        { timeout: 4000 }
      );
    } else {
      fallbackPin();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingLockRef.current || isSubmitting || submittedRef) {
      return;
    }
    setSubmitError(null);
    const validation = validateServiceRequestInput(
      {
        clientName,
        clientPhone,
        serviceType,
        neighborhood,
        addressPin,
        description,
        preferredDate,
        preferredTimeSlot,
        paymentMethod,
      },
      lang
    );

    if (!validation.valid) {
      setErrors(validation.errors as Record<string, string>);
      return;
    }

    if (preferredDate < todayIso) {
      setErrors({
        preferredDate:
          lang === 'ar'
            ? 'يرجى اختيار تاريخ اليوم أو تاريخ مستقبلي.'
            : 'Veuillez choisir une date égale ou postérieure à aujourd’hui.',
      });
      return;
    }

    submittingLockRef.current = true;
    setErrors({});
    setIsSubmitting(true);
    try {
      const bookingRef = await onSubmitBooking({
        bookingId: preGeneratedIds.bookingId,
        bookingRef: preGeneratedIds.bookingRef,
        provider,
        clientName: clientName.trim(),
        clientPhone: validation.normalizedPhone,
        serviceType: serviceType.trim(),
        neighborhood: neighborhood.trim(),
        addressPin: addressPin.trim(),
        description: description.trim(),
        problemPhotoUrl: problemPhotoUrl || undefined,
        preferredDate,
        preferredTimeSlot,
        paymentMethod,
        estimatedMad,
      });
      setSubmittedRef(bookingRef);
    } catch (err) {
      setSubmitError(mapProfileSaveError(err, lang));
    } finally {
      setIsSubmitting(false);
      submittingLockRef.current = false;
    }
  };

  const handleInlineGoogleSignIn = async () => {
    if (!onGoogleSignIn) return;
    setSubmitError(null);
    setIsSigningInInline(true);
    try {
      await onGoogleSignIn();
    } catch (err) {
      setSubmitError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsSigningInInline(false);
    }
  };

  const whatsappUrl = buildWhatsAppUrl({
    phone: provider.phone,
    lang,
    providerName: providerDisplayName,
    category: t.categories[provider.category],
    bookingRef: submittedRef ?? undefined,
    serviceType,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 md:p-8 shadow-lg my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 id="booking-modal-title" className="text-lg md:text-xl font-bold text-slate-900">
              {t.bookingModalTitle} — {providerDisplayName}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {t.categories[provider.category]} · {t.cities[provider.location.city]} (
              {lang === 'ar'
                ? provider.location.quartierAr || provider.location.quartier
                : provider.location.quartier}
              )
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedRef ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{t.requestSubmittedTitle}</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">{t.requestSubmittedDesc}</p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 max-w-md mx-auto space-y-1.5">
              <div className="font-mono-tabular font-bold text-emerald-800">
                Réf: {submittedRef}
              </div>
              <div className="font-semibold text-slate-900">
                {providerDisplayName} — {serviceType}
              </div>
              <div>
                {t.cities[provider.location.city]} · {neighborhood} · {preferredDate} (
                {preferredTimeSlot})
              </div>
              <div className="text-slate-600">
                {paymentMethod === 'cash_on_completion'
                  ? t.paymentCashLabel
                  : t.paymentCmiLabel}
              </div>
              <div className="tabular-nums font-bold text-emerald-700 pt-1">
                {t.estimatedTotalLabel}: {formatMadCurrency(estimatedMad, lang)}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t.whatsappContactBtn}</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        ) : !firebaseUser ? (
          <div className="py-8 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'ar'
                  ? 'سجّل الدخول لتأكيد حجزك بأمان'
                  : 'Connectez-vous pour confirmer votre réservation'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'ar'
                  ? 'لحماية طلباتك وتفعيل الدردشة المباشرة وضمان CMI، يرجى تسجيل الدخول بحسابك أو إنشاء حساب جديد في ثوانٍ.'
                  : 'Pour suivre votre intervention, discuter en direct avec le Maâlem et bénéficier du séquestre CMI, connectez-vous en un clic.'}
              </p>
            </div>

            <div className="max-w-md mx-auto p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600">{t.estimatedTotalLabel}</span>
              <span className="font-bold tabular-nums text-slate-900">
                {formatMadCurrency(estimatedMad, lang)}
              </span>
            </div>

            {submitError && (
              <div
                role="alert"
                className="max-w-md mx-auto p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800 text-start"
              >
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              {onGoogleSignIn && (
                <button
                  type="button"
                  disabled={isSigningInInline}
                  onClick={() => {
                    void handleInlineGoogleSignIn();
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t.googleSignInBtn}</span>
                </button>
              )}
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>
                    {lang === 'ar'
                      ? 'الدخول بالبريد الإلكتروني'
                      : 'Connexion / Inscription par e-mail'}
                  </span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>
                  {lang === 'ar'
                    ? 'أو تواصل مباشرة عبر واتساب للاستفسار'
                    : 'Ou poser une question rapide sur WhatsApp'}
                </span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            <p className="text-xs text-slate-600">{t.bookingModalSubtitle}</p>

            {submissionMode === 'unverified' && (
              <div
                role="alert"
                className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-900"
              >
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <p>
                  {lang === 'ar'
                    ? 'يرجى تأكيد بريدك الإلكتروني في قسم الملف الشخصي قبل تأكيد الحجز.'
                    : 'Veuillez confirmer votre adresse e-mail depuis votre espace profil avant d’envoyer une réservation.'}
                </p>
              </div>
            )}

            {/* Client Name & Moroccan Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="booking-client-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t.fullNameLabel} <span className="text-rose-600">*</span>
                </label>
                <input
                  id="booking-client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t.fullNamePlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {errors.clientName && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.clientName}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="booking-client-phone"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t.phoneLabel} <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
                  <input
                    id="booking-client-phone"
                    type="tel"
                    dir="ltr"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+212661234567"
                    className="w-full ps-9 pe-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                {errors.clientPhone && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.clientPhone}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Service Type & Neighborhood */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="booking-service-type"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t.serviceTypeLabel} <span className="text-rose-600">*</span>
                </label>
                <select
                  id="booking-service-type"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {availableServices.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                  {!availableServices.includes(t.categories[provider.category]) && (
                    <option value={t.categories[provider.category]}>
                      {t.categories[provider.category]} — Diagnostic général
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="booking-neighborhood"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t.neighborhoodLabel} ({t.cities[provider.location.city]}){' '}
                  <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
                  <input
                    id="booking-neighborhood"
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder={t.neighborhoodPlaceholder}
                    className="w-full ps-9 pe-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                {errors.neighborhood && (
                  <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.neighborhood}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Preferred Date & Preferred Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="booking-date"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {t.preferredDateLabel} <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
                  <input
                    id="booking-date"
                    type="date"
                    min={todayIso}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full ps-9 pe-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                {errors.preferredDate && (
                  <p className="mt-1 text-xs text-rose-600">{errors.preferredDate}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.preferredTimeSlotLabel} <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPreferredTimeSlot(slot)}
                      className={`px-2 py-2 text-xs font-mono-tabular font-semibold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        preferredTimeSlot === slot
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{slot.replace(' - ', '–')}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Address / Pin Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="booking-address-pin"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {t.addressPinLabel} <span className="text-rose-600">*</span>
                </label>
                <button
                  type="button"
                  disabled={isLocatingPin}
                  onClick={handleInsertGpsPin}
                  className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold hover:underline cursor-pointer disabled:opacity-60"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{isLocatingPin ? t.nearMeLocating : t.useGpsPinBtn}</span>
                </button>
              </div>
              <input
                id="booking-address-pin"
                type="text"
                value={addressPin}
                onChange={(e) => setAddressPin(e.target.value)}
                placeholder={t.addressPinPlaceholder}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {errors.addressPin && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.addressPin}</span>
                </p>
              )}
            </div>

            {/* Problem Description */}
            <div>
              <label
                htmlFor="booking-description"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t.requestDescriptionLabel} <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="booking-description"
                rows={3}
                maxLength={600}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.requestDescriptionPlaceholder}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.description}</span>
                </p>
              )}
            </div>

            {/* Optional Problem Photo Upload */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    {t.problemPhotoLabel}
                  </span>
                  <span className="text-[11px] text-slate-500">{t.problemPhotoHint}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer">
                    <Camera className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{isUploadingPhoto ? '...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingPhoto}
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                  </label>
                  {!problemPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoError(null);
                        setProblemPhotoUrl(
                          provider.portfolioImages[0] ||
                            '/src/assets/images/service_plumbing_repair_1794980477189.jpg'
                        );
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
                    >
                      {t.attachSamplePhotoBtn}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        revokePreviewObjectUrl(problemPhotoUrl);
                        setProblemPhotoUrl('');
                        setPhotoError(null);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
                    >
                      {t.removePhotoBtn}
                    </button>
                  )}
                </div>
              </div>
              {photoError && (
                <p className="text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{photoError}</span>
                </p>
              )}
              {problemPhotoUrl && (
                <div className="pt-1 flex items-center gap-3">
                  <img
                    src={problemPhotoUrl}
                    alt="Aperçu du problème"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-300"
                  />
                  <span className="text-xs text-emerald-700 font-medium">
                    ✓ Photo jointe au dossier d’intervention
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method Selector: Cash on Completion (Live, 0% launch fee) vs CMI Online Gateway (Coming Soon) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                {t.paymentMethodLabel} <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash_on_completion')}
                  className="p-3.5 rounded-xl border text-start transition-colors cursor-pointer flex items-start gap-3 bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600"
                >
                  <Banknote className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{t.paymentCashLabel}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                        {lang === 'ar' ? '0% رسوم' : '0% frais'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      {t.paymentCashDesc}
                    </div>
                  </div>
                </button>

                <div
                  aria-disabled="true"
                  className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-start flex items-start gap-3 opacity-75 cursor-not-allowed"
                >
                  <CreditCard className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700">{t.paymentCmiLabel}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-200 text-slate-700">
                        {t.paymentCmiComingSoonBadge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {lang === 'ar'
                        ? 'سيتم تفعيل الدفع الإلكتروني عبر بوابة CMI المعتمدة قريباً.'
                        : 'Activation prochaine via passerelle CMI certifiée côté serveur.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transparent MAD / DH Summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.estimatedTotalLabel}</span>
              </div>
              <div className="text-base font-bold tabular-nums text-slate-900">
                {formatMadCurrency(estimatedMad, lang)}
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800"
              >
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {t.closeBtn}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
              >
                {isSubmitting ? t.submittingRequestBtn : t.submitRequestBtn}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
