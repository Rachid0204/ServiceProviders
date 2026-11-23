import { uiText } from '../i18n/uiCopy';
import React, { useState } from 'react';
import { X, Star, CheckCircle2, ChevronDown, ChevronUp, Camera } from 'lucide-react';
import type {
  BookingRecord,
  LanguageCode,
  ReviewCategoryBreakdown,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';
import { uploadMarketplacePhoto } from '../utils/storageUpload';

interface ReviewModalProps {
  booking: BookingRecord;
  lang: LanguageCode;
  t: Translations;
  userId?: string | null;
  onClose: () => void;
  onSubmitReview: (
    bookingId: string,
    rating: number,
    comment: string,
    reviewCategories?: ReviewCategoryBreakdown,
    photoUrls?: string[]
  ) => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  booking,
  lang,
  t,
  userId = null,
  onClose,
  onSubmitReview,
}) => {
  const isAr = lang === 'ar';
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showOptionalCategories, setShowOptionalCategories] = useState<boolean>(false);
  const [punctuality, setPunctuality] = useState<number>(5);
  const [quality, setQuality] = useState<number>(5);
  const [value, setValue] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || photoUrls.length >= 3) return;
    setPhotoError(null);
    setIsUploadingPhoto(true);
    try {
      const res = await uploadMarketplacePhoto({
        file,
        scope: 'reviews',
        entityId: booking.id,
        userId,
        lang,
      });
      setPhotoUrls((prev) => [...prev, res.url].slice(0, 3));
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : uiText(isAr).common.impossibleDeTeleverserLaPhoto
      );
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const categoriesPayload: ReviewCategoryBreakdown | undefined = showOptionalCategories
        ? { punctuality, quality, value }
        : undefined;
      await onSubmitReview(
        booking.id,
        rating,
        comment.trim() ||
          (uiText(isAr).booking.interventionRapideEtTravailTresSoigne),
        categoriesPayload,
        photoUrls.length > 0 ? photoUrls : undefined
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 id="review-modal-title" className="text-base font-bold text-slate-900">
              {t.reviewModalTitle}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {booking.providerName} · #{booking.bookingRef}
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
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {t.reviewRatingLabel}
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} stars`}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                    star <= rating
                      ? 'bg-amber-50 border-amber-300 text-amber-600'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                  <span className="text-xs font-bold tabular-nums">{star}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible Optional Rating Categories (Collapsed by Default) */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              aria-expanded={showOptionalCategories}
              onClick={() => setShowOptionalCategories((prev) => !prev)}
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <span>
                {uiText(isAr).booking.criteresDetaillesOptionnel}
              </span>
              {showOptionalCategories ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showOptionalCategories && (
              <div className="p-3.5 bg-white space-y-2.5 text-xs border-t border-slate-200">
                {[
                  {
                    id: 'punctuality',
                    label: uiText(isAr).booking.ponctualite,
                    val: punctuality,
                    setter: setPunctuality,
                  },
                  {
                    id: 'quality',
                    label: uiText(isAr).booking.qualiteDuTravail,
                    val: quality,
                    setter: setQuality,
                  },
                  {
                    id: 'value',
                    label: uiText(isAr).booking.respectDuDevisMad,
                    val: value,
                    setter: setValue,
                  },
                ].map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between gap-2">
                    <span className="text-slate-700 font-medium">{cat.label}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => cat.setter(s)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums border cursor-pointer ${
                            s <= cat.val
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          {s}★
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="review-comment"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t.reviewCommentLabel}
            </label>
            <textarea
              id="review-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.reviewCommentPlaceholder}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Optional Completed-Work Review Photos (up to 3) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                {t.reviewAttachPhotosLabel}
              </span>
              <label
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer ${
                  isUploadingPhoto || photoUrls.length >= 3 ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isUploadingPhoto ? '...' : uiText(isAr).booking.photo}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    void handlePhotoUpload(e);
                  }}
                  className="hidden"
                />
              </label>
            </div>
            {photoError && <p className="text-xs text-rose-600">{photoError}</p>}
            {photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photoUrls.map((url, i) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt={`Avis photo ${i + 1}`}
                      className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoUrls((prev) => prev.filter((u) => u !== url))}
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
              disabled={isSubmitting || isUploadingPhoto}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.submitReviewBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
