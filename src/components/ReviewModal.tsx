import React, { useState } from 'react';
import { X, Star, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type {
  BookingRecord,
  LanguageCode,
  ReviewCategoryBreakdown,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';

interface ReviewModalProps {
  booking: BookingRecord;
  lang: LanguageCode;
  t: Translations;
  onClose: () => void;
  onSubmitReview: (
    bookingId: string,
    rating: number,
    comment: string,
    reviewCategories?: ReviewCategoryBreakdown
  ) => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  booking,
  lang,
  t,
  onClose,
  onSubmitReview,
}) => {
  const isAr = lang === 'ar';
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [showOptionalCategories, setShowOptionalCategories] = useState<boolean>(false);
  const [punctuality, setPunctuality] = useState<number>(5);
  const [quality, setQuality] = useState<number>(5);
  const [value, setValue] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const trimmedComment = comment.trim();
    const finalComment =
      trimmedComment.length > 0
        ? trimmedComment
        : isAr
        ? 'تدخل سريع وعمل متقن للغاية. شكراً جزيلاً للمعلم!'
        : 'Intervention rapide et travail très soigné. Merci Maâlem !';

    if (finalComment.length < 2 || finalComment.length > 500) {
      setSubmitError(
        isAr
          ? 'يجب أن يتراوح التعليق بين حرفين و 500 حرف.'
          : 'Le commentaire doit contenir entre 2 et 500 caractères.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const categoriesPayload: ReviewCategoryBreakdown | undefined = showOptionalCategories
        ? { punctuality, quality, value }
        : undefined;
      await onSubmitReview(booking.id, rating, finalComment, categoriesPayload);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : isAr
          ? 'تعذر إرسال التقييم. يرجى المحاولة مجدداً.'
          : 'Impossible d’enregistrer votre avis. Veuillez réessayer.'
      );
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
                {isAr
                  ? 'معايير التقييم التفصيلية (اختياري)'
                  : 'Critères détaillés (optionnel)'}
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
                    label: isAr ? 'الالتزام بالموعد' : 'Ponctualité',
                    val: punctuality,
                    setter: setPunctuality,
                  },
                  {
                    id: 'quality',
                    label: isAr ? 'جودة الإنجاز' : 'Qualité du travail',
                    val: quality,
                    setter: setQuality,
                  },
                  {
                    id: 'value',
                    label: isAr ? 'احترام التسعيرة' : 'Respect du devis MAD',
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
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.reviewCommentPlaceholder}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {submitError && (
            <div
              role="alert"
              className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800"
            >
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
              <span>{t.submitReviewBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
