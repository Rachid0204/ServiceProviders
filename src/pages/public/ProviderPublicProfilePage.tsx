import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Star,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db, reportFirestoreError, OperationType } from '../../firebase';
import {
  buildWhatsAppUrl,
  formatMadCurrency,
  type ProviderReview,
} from '../../utils/marketplace';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS, buildServiceCategoryPath } from '../../app/routePaths';

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

export const ProviderPublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { lang, t, isAr, allProviders, setBookingProvider } = useMarketplace();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [liveReviews, setLiveReviews] = useState<ProviderReview[]>([]);

  const provider = useMemo(
    () => (id ? allProviders.find((p) => p.id === id || p.uid === id) ?? null : null),
    [allProviders, id]
  );

  useEffect(() => {
    setActiveImageIndex(0);
    setLiveReviews([]);
    if (!provider?.id) return;

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
  }, [provider?.id]);

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  if (!provider) {
    return (
      <section className="max-w-2xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 mx-auto">
          <Briefcase className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{t.providerNotFoundTitle}</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">{t.providerNotFoundDesc}</p>
        <Link
          to={ROUTE_PATHS.SERVICES}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t.backToServicesBtn}</span>
        </Link>
      </section>
    );
  }

  const displayedReviews =
    liveReviews.length > 0
      ? [
          ...liveReviews,
          ...provider.reviews.filter((r) => !liveReviews.some((lr) => lr.id === r.id)),
        ]
      : provider.reviews;

  const displayName = isAr ? provider.fullNameAr : provider.fullNameFr;
  const displayBio = isAr ? provider.bioAr : provider.bioFr;
  const displaySkills = isAr ? provider.skillsAr : provider.skills;
  const displayDiploma = isAr ? provider.diplomaAr : provider.diplomaFr;
  const displayQuartier = isAr
    ? provider.location.quartierAr || provider.location.quartier
    : provider.location.quartier;

  const providerWhatsappUrl = buildWhatsAppUrl({
    phone: provider.phone,
    lang,
    providerName: displayName,
    category: t.categories[provider.category],
  });
  const telHref = `tel:${provider.phone.replace(/[^\d+]/g, '')}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={buildServiceCategoryPath(provider.category)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700"
        >
          <BackIcon className="w-4 h-4" />
          <span>
            {t.backToServicesBtn} · {t.categories[provider.category]}
          </span>
        </Link>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Portfolio Image */}
          <div className="lg:col-span-5 bg-slate-100 flex flex-col">
            <div className="relative h-64 lg:h-80 overflow-hidden">
              <img
                src={provider.portfolioImages[activeImageIndex] || provider.portfolioImages[0]}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 start-3">
                {provider.verifiedBadge ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-700 text-white text-xs font-semibold shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t.verifiedCinLabel}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-xs font-medium">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{t.verifiedPendingText}</span>
                  </span>
                )}
              </div>
            </div>
            {provider.portfolioImages.length > 1 && (
              <div className="flex items-center gap-2 p-3 overflow-x-auto bg-slate-50 border-t border-slate-200">
                {provider.portfolioImages.map((imgUrl, idx) => (
                  <button
                    key={imgUrl + idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                      idx === activeImageIndex ? 'border-emerald-700' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${displayName} ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Core Summary & CTAs */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 font-semibold border border-amber-200">
                  {t.categories[provider.category]}
                </span>
                <span
                  className={`font-semibold ${
                    provider.isAvailableNow ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  {provider.isAvailableNow ? t.availableNowText : t.busyScheduledText}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{displayName}</h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <span>
                    {t.cities[provider.location.city]} · {displayQuartier}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-900 tabular-nums">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{provider.ratingAvg.toFixed(1)}</span>
                  <span className="text-slate-500 font-normal">
                    ({provider.reviewCount} {t.reviewsLabel})
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>
                    {t.responseTime} {provider.responseMinutes} {t.minutesUnit}
                  </span>
                </span>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">{displayBio}</p>

              {/* Pricing Strip */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                <div>
                  <div className="text-slate-500">{t.hourlyRateLabel}</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                    {formatMadCurrency(provider.hourlyRateMAD, lang)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">{t.calloutFeeLabel}</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                    {provider.fixedVisitFeeMAD === 0
                      ? t.freeCallout
                      : formatMadCurrency(provider.fixedVisitFeeMAD, lang)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">{t.experienceYears}</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                    {provider.experienceYears}+
                  </div>
                </div>
              </div>

              {/* Skills */}
              {displaySkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {displaySkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 text-xs font-medium border border-emerald-100"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBookingProvider(provider)}
                className="flex-1 min-w-[160px] px-5 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer"
              >
                {t.bookProviderBtn}
              </button>
              <a
                href={providerWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>WhatsApp</span>
              </a>
              <a
                href={telHref}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <Phone className="w-4 h-4 text-slate-600" />
                <span>{isAr ? 'اتصال' : 'Appeler'}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Credentials & Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-700" />
            <span>{t.detailModalCredentialsTitle}</span>
          </h2>
          <dl className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <dt className="text-slate-500">{t.detailModalCinLabel}</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{provider.cinNumberMasked}</dd>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <dt className="text-slate-500">{t.detailModalDiplomaLabel}</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{displayDiploma}</dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            {t.detailModalReviewsTitle} ({displayedReviews.length})
          </h2>
          {displayedReviews.length === 0 ? (
            <p className="text-xs text-slate-500">
              {isAr
                ? 'لا توجد تقييمات بعد لهذا المعلم.'
                : 'Aucun avis client publié pour le moment.'}
            </p>
          ) : (
            <div className="space-y-3">
              {displayedReviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{review.authorName}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {isAr ? review.commentAr : review.commentFr}
                  </p>
                  <div className="text-[11px] text-slate-400">{review.date}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
