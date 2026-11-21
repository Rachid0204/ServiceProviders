import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Star,
  MapPin,
  Clock,
  Award,
  CheckCircle2,
  Briefcase,
  Navigation,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db, reportFirestoreError, OperationType } from '../firebase';
import {
  formatMadCurrency,
  type LanguageCode,
  type ProviderReview,
  type VettedProvider,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';

interface ProviderDetailModalProps {
  provider: VettedProvider;
  lang: LanguageCode;
  t: Translations;
  onClose: () => void;
  onBookProvider: (provider: VettedProvider) => void;
}

function formatReviewDate(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    try {
      return (ts as Timestamp).toDate().toISOString().slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({
  provider,
  lang,
  t,
  onClose,
  onBookProvider,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [liveReviews, setLiveReviews] = useState<ProviderReview[]>([]);

  useEffect(() => {
    setActiveImageIndex(0);
    setLiveReviews([]);
    const q = query(
      collection(db, 'reviews'),
      where('providerId', '==', provider.id),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ProviderReview[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorName: String(data.authorName || 'Client'),
            quartier: String(data.quartier || ''),
            rating: Number(data.rating || 5),
            date: formatReviewDate(data.createdAt),
            commentFr: String(data.comment || ''),
            commentAr: String(data.comment || ''),
          };
        });
        loaded.sort((a, b) => b.date.localeCompare(a.date));
        setLiveReviews(loaded);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, `reviews?providerId=${provider.id}`);
      }
    );
    return () => unsubscribe();
  }, [provider.id]);

  const displayedReviews = useMemo(() => {
    if (liveReviews.length === 0) return provider.reviews;
    const seen = new Set(liveReviews.map((r) => r.id));
    return [...liveReviews, ...provider.reviews.filter((r) => !seen.has(r.id))];
  }, [liveReviews, provider.reviews]);

  const displayName = lang === 'ar' ? provider.fullNameAr : provider.fullNameFr;
  const displayBio = lang === 'ar' ? provider.bioAr : provider.bioFr;
  const displaySkills = lang === 'ar' ? provider.skillsAr : provider.skills;
  const displayDiploma = lang === 'ar' ? provider.diplomaAr : provider.diplomaFr;
  const displayQuartier =
    lang === 'ar'
      ? provider.location.quartierAr || provider.location.quartier
      : provider.location.quartier;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="provider-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full shadow-lg my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200 bg-slate-50">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-amber-800">
                {t.categories[provider.category]}
              </span>
              <span aria-hidden="true">·</span>
              {provider.verifiedBadge ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{t.verifiedCinLabel}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{lang === 'ar' ? 'التحقق من CIN قيد المراجعة' : 'CIN en cours de vérification'}</span>
                </span>
              )}
              <span aria-hidden="true">·</span>
              <span
                className={
                  provider.isAvailableNow
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600'
                }
              >
                {provider.isAvailableNow ? t.availableNowText : t.busyScheduledText}
              </span>
            </div>
            <h2 id="provider-detail-title" className="text-xl md:text-2xl font-bold text-slate-900">
              {displayName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {t.cities[provider.location.city]} · {displayQuartier}
              </span>
              {provider.distanceKm != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold tabular-nums">
                    <Navigation className="w-3 h-3" />
                    {provider.distanceKm} {t.distanceAwayUnit}
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-slate-900 tabular-nums">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {provider.ratingAvg.toFixed(1)} ({provider.reviewCount} {t.reviewsLabel})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <div className="text-xs text-slate-500">{t.hourlyRateLabel}</div>
              <div className="text-base font-bold tabular-nums text-slate-900 mt-0.5">
                {formatMadCurrency(provider.hourlyRateMAD, lang)} / h
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t.calloutFeeLabel}</div>
              <div className="text-base font-bold tabular-nums text-slate-900 mt-0.5">
                {provider.fixedVisitFeeMAD > 0
                  ? formatMadCurrency(provider.fixedVisitFeeMAD, lang)
                  : t.freeCallout}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t.jobsCompleted}</div>
              <div className="text-base font-bold tabular-nums text-emerald-700 mt-0.5 flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                <span>{provider.completedJobs}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t.experienceYears}</div>
              <div className="text-base font-bold tabular-nums text-slate-900 mt-0.5 flex items-center gap-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  {provider.experienceYears} {t.experienceYears}
                </span>
              </div>
            </div>
          </div>

          {/* Bio & Skills */}
          <div className="space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">{displayBio}</p>
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">
                {lang === 'ar' ? 'المهارات والتخصصات:' : 'Compétences clés :'}{' '}
              </span>
              {displaySkills.join(' · ')}
            </div>
          </div>

          {/* Verified Credentials Box */}
          <div
            className={`p-4 rounded-xl space-y-2.5 border ${
              provider.verifiedBadge
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-amber-50/50 border-amber-200'
            }`}
          >
            <h3
              className={`text-xs font-bold flex items-center gap-1.5 ${
                provider.verifiedBadge ? 'text-emerald-950' : 'text-amber-950'
              }`}
            >
              <Award
                className={`w-4 h-4 shrink-0 ${
                  provider.verifiedBadge ? 'text-emerald-700' : 'text-amber-700'
                }`}
              />
              <span>{t.detailModalCredentialsTitle}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div
                className={`bg-white p-3 rounded-lg border ${
                  provider.verifiedBadge ? 'border-emerald-100' : 'border-amber-100'
                }`}
              >
                <div className="text-slate-500">{t.detailModalCinLabel}</div>
                <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  {provider.verifiedBadge ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono-tabular">{provider.cinNumberMasked}</span>
                      <span className="text-emerald-700">({t.verifiedCinLabel})</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-amber-800">
                        {lang === 'ar' ? 'قيد التحقق من الهوية' : 'Vérification en attente'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div
                className={`bg-white p-3 rounded-lg border ${
                  provider.verifiedBadge ? 'border-emerald-100' : 'border-amber-100'
                }`}
              >
                <div className="text-slate-500">{t.detailModalDiplomaLabel}</div>
                <div className="font-semibold text-slate-900 mt-0.5">{displayDiploma}</div>
              </div>
            </div>
          </div>

          {/* Portfolio Gallery */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">{t.detailModalPortfolioTitle}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 h-56 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={provider.portfolioImages[activeImageIndex] || provider.portfolioImages[0]}
                  alt={`${displayName} portfolio`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="sm:col-span-4 flex sm:flex-col gap-2">
                {provider.portfolioImages.map((imgUrl, idx) => (
                  <button
                    key={imgUrl + idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative h-24 sm:h-26 flex-1 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-emerald-600'
                        : 'border-slate-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${displayName} miniature ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Client Reviews */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              {t.detailModalReviewsTitle} ({provider.reviewCount})
            </h3>
            {displayedReviews.length === 0 ? (
              <p className="text-xs text-slate-500">
                {lang === 'ar'
                  ? 'لا توجد تقييمات مكتوبة بعد لهذا المعلم.'
                  : 'Aucun avis écrit pour ce Maâlem pour le moment.'}
              </p>
            ) : (
              <div className="space-y-3">
                {displayedReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-semibold text-slate-900">
                        {rev.authorName}{' '}
                        <span className="font-normal text-slate-500">· {rev.quartier}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-slate-900 tabular-nums">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>{rev.rating.toFixed(1)}</span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-500 font-normal">{rev.date}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {lang === 'ar' ? rev.commentAr : rev.commentFr}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              {formatMadCurrency(provider.hourlyRateMAD, lang)}/h
            </span>{' '}
            · {t.calloutFeeLabel}:{' '}
            {provider.fixedVisitFeeMAD > 0
              ? formatMadCurrency(provider.fixedVisitFeeMAD, lang)
              : t.freeCallout}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {t.closeBtn}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onBookProvider(provider);
              }}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              {t.bookProviderBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
