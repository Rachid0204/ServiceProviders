import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Camera,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Zap,
  Sparkles,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  MOROCCAN_CITIES,
  SERVICE_CATEGORIES,
  TIME_SLOTS,
  generateJobPostIds,
  getTodayIsoDate,
  validateJobPostInput,
  formatMadCurrency,
  type JobUrgency,
  type LanguageCode,
  type MoroccanCity,
  type ServiceCategory,
  type TimeSlot,
  type UserProfileRecord,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';
import type { CreateJobPostPayload } from '../hooks/useJobPosts';
import { uploadMarketplacePhoto, revokePreviewObjectUrl } from '../utils/storageUpload';
import { mapProfileSaveError } from '../utils/authHelpers';

interface PostJobModalProps {
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  userProfile: UserProfileRecord | null;
  onCreateJobPost: (payload: CreateJobPostPayload) => Promise<string>;
  onClose: () => void;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({
  lang,
  t,
  firebaseUser,
  userProfile,
  onCreateJobPost,
  onClose,
}) => {
  const isAr = lang === 'ar';
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const preGeneratedIds = useMemo(() => generateJobPostIds(), []);

  const [clientName, setClientName] = useState(
    userProfile?.fullName ?? firebaseUser?.displayName ?? ''
  );
  const [clientPhone, setClientPhone] = useState(userProfile?.phone ?? '+2126');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('Plomberie');
  const [city, setCity] = useState<MoroccanCity>(userProfile?.city ?? 'Casablanca');
  const [neighborhood, setNeighborhood] = useState(userProfile?.neighborhood ?? '');
  const [budgetMad, setBudgetMad] = useState<number>(300);
  const [urgency, setUrgency] = useState<JobUrgency>('this_week');
  const [preferredDate, setPreferredDate] = useState(todayIso);
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<TimeSlot>('09:00 - 12:00');
  const [description, setDescription] = useState('');
  const [problemPhotoUrl, setProblemPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJobRef, setCreatedJobRef] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      revokePreviewObjectUrl(problemPhotoUrl);
    };
  }, [problemPhotoUrl]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setPhotoError(null);
    setIsUploadingPhoto(true);
    try {
      const res = await uploadMarketplacePhoto({
        file,
        scope: 'jobPosts',
        entityId: preGeneratedIds.jobId,
        userId: firebaseUser.uid,
        lang,
      });
      setProblemPhotoUrl((prev) => {
        revokePreviewObjectUrl(prev);
        return res.url;
      });
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : isAr
          ? 'تعذر رفع الصورة.'
          : 'Impossible de téléverser la photo.'
      );
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || createdJobRef) return;
    setSubmitError(null);

    const check = validateJobPostInput(
      {
        clientName,
        clientPhone,
        title,
        category,
        city,
        neighborhood,
        description,
        budgetMad,
        preferredDate,
        preferredTimeSlot,
      },
      lang
    );

    if (!check.valid) {
      setErrors(check.errors as Record<string, string>);
      return;
    }

    if (preferredDate < todayIso) {
      setErrors({
        preferredDate: isAr
          ? 'يرجى اختيار تاريخ اليوم أو تاريخ مستقبلي.'
          : 'Veuillez choisir une date égale ou postérieure à aujourd’hui.',
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const ref = await onCreateJobPost({
        jobId: preGeneratedIds.jobId,
        jobRef: preGeneratedIds.jobRef,
        clientName: clientName.trim(),
        clientPhone: check.normalizedPhone,
        title: title.trim(),
        category,
        city,
        neighborhood: neighborhood.trim(),
        description: description.trim(),
        budgetMad: Math.round(budgetMad),
        urgency,
        preferredDate,
        preferredTimeSlot,
        problemPhotoUrl: problemPhotoUrl || undefined,
      });
      setCreatedJobRef(ref);
    } catch (err) {
      setSubmitError(mapProfileSaveError(err, lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-job-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'استقبل عروض المعلمين المعتمدين' : 'Recevez des devis de Maâlems'}</span>
            </div>
            <h2 id="post-job-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              {isAr ? 'نشر طلب خدمة جديد' : 'Publier un besoin / une mission'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {isAr
                ? 'صف الخدمة التي تحتاجها وميزانيتك، وسيتقدم المعلمون المؤهلون في مدينتك بعروضهم.'
                : 'Décrivez votre besoin et votre budget : les Maâlems de votre ville vous enverront leurs devis directement dans votre espace.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdJobRef ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {isAr ? 'تم نشر طلبك بنجاح!' : 'Votre annonce est en ligne !'}
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {isAr
                ? 'طلبك مرئي الآن للمعلمين المعتمدين. ستصلك العروض والأسعار مباشرة في قسم « طلباتي المنشورة ».'
                : 'Votre besoin est désormais visible par les Maâlems vérifiés. Vous pourrez comparer leurs devis dans « Mes Besoins Publiés ».'}
            </p>
            <div className="max-w-sm mx-auto p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-mono-tabular font-bold text-emerald-800">{createdJobRef}</div>
              <div className="font-semibold text-slate-900">{title}</div>
              <div className="text-slate-600">
                {t.categories[category]} · {t.cities[city]} ({neighborhood}) ·{' '}
                <span className="font-bold text-emerald-700">
                  {formatMadCurrency(budgetMad, lang)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 cursor-pointer"
            >
              {isAr ? 'عرض في لوحة التحكم' : 'Voir dans mon tableau de bord'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'عنوان الخدمة المطلوبة' : 'Titre du besoin'}{' '}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    isAr
                      ? 'مثال: إصلاح تسرب مياه في المطبخ وتركيب سخان'
                      : 'Ex: Réparation fuite sous évier + pose mitigeur'
                  }
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title}</p>}
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'التخصص المطلوب' : 'Catégorie métier'}{' '}
                  <span className="text-rose-600">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t.categories[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* City, Neighborhood, Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.cityLabel} <span className="text-rose-600">*</span>
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value as MoroccanCity)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {MOROCCAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {t.cities[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.neighborhoodLabel} <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder={t.neighborhoodPlaceholder}
                    className="w-full ps-9 pe-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                {errors.neighborhood && (
                  <p className="mt-1 text-xs text-rose-600">{errors.neighborhood}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isAr ? 'الميزانية التقديرية (د.م.)' : 'Budget estimé (DH)'}{' '}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min={50}
                  max={100000}
                  step={10}
                  value={budgetMad}
                  onChange={(e) => setBudgetMad(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {errors.budgetMad && (
                  <p className="mt-1 text-xs text-rose-600">{errors.budgetMad}</p>
                )}
              </div>
            </div>

            {/* Urgency Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isAr ? 'درجة الاستعجال' : 'Niveau d’urgence'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'urgent' as const, fr: 'Urgent (24h)', ar: 'مستعجل (24 ساعة)' },
                    { id: 'this_week' as const, fr: 'Cette semaine', ar: 'هذا الأسبوع' },
                    { id: 'flexible' as const, fr: 'Flexible', ar: 'مرن' },
                  ] as const
                ).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgency(u.id)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      urgency === u.id
                        ? u.id === 'urgent'
                          ? 'bg-rose-50 border-rose-600 text-rose-800'
                          : 'bg-emerald-50 border-emerald-600 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {u.id === 'urgent' && <Zap className="w-3.5 h-3.5" />}
                    <span>{isAr ? u.ar : u.fr}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.preferredDateLabel} <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
                  <input
                    type="date"
                    min={todayIso}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full ps-9 pe-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                {errors.preferredDate && (
                  <p className="mt-1 text-xs text-rose-600">{errors.preferredDate}</p>
                )}
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
                      onClick={() => setPreferredTimeSlot(slot)}
                      className={`px-2 py-2 text-xs font-mono-tabular font-semibold rounded-lg border cursor-pointer flex items-center justify-center gap-1 ${
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

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.requestDescriptionLabel} <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                maxLength={800}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.requestDescriptionPlaceholder}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-rose-600">{errors.description}</p>
              )}
            </div>

            {/* Optional Photo Upload */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-800">{t.problemPhotoLabel}</div>
                <div className="text-[11px] text-slate-500">{t.problemPhotoHint}</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer">
                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    {isUploadingPhoto
                      ? isAr
                        ? 'جاري الرفع...'
                        : 'Upload...'
                      : isAr
                      ? 'إضافة صورة'
                      : 'Ajouter une photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {problemPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      revokePreviewObjectUrl(problemPhotoUrl);
                      setProblemPhotoUrl('');
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg cursor-pointer"
                  >
                    {t.removePhotoBtn}
                  </button>
                )}
              </div>
              {photoError && <p className="w-full text-xs text-rose-600">{photoError}</p>}
              {problemPhotoUrl && (
                <div className="w-full flex items-center gap-3 pt-1">
                  <img
                    src={problemPhotoUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-300"
                  />
                  <span className="text-xs text-emerald-700 font-medium">
                    {isAr ? '✓ تم إرفاق الصورة' : '✓ Photo jointe'}
                  </span>
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.fullNameLabel} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t.fullNamePlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {errors.clientName && (
                  <p className="mt-1 text-xs text-rose-600">{errors.clientName}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.phoneLabel} <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
                  <input
                    type="tel"
                    dir="ltr"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+212661234567"
                    className="w-full ps-9 pe-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                {errors.clientPhone && (
                  <p className="mt-1 text-xs text-rose-600">{errors.clientPhone}</p>
                )}
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
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                {t.closeBtn}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting
                  ? isAr
                    ? 'جاري النشر...'
                    : 'Publication...'
                  : isAr
                  ? 'نشر الطلب الآن'
                  : 'Publier mon besoin'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
