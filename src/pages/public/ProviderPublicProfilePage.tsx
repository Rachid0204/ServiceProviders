import { uiText } from '../../i18n/uiCopy';
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tag,
} from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  limit,
  onSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db, reportFirestoreError, OperationType } from '../../firebase';
import {
  DEFAULT_CATEGORY_IMAGE,
  WEEKDAY_KEYS,
  buildWhatsAppUrl,
  formatMadCurrency,
  isSafeImageUrl,
  maskMoroccanPhone,
  type ProviderReview,
  type VettedProvider,
  type WeekdayKey,
} from '../../utils/marketplace';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS, buildServiceCategoryPath } from '../../app/routePaths';
import { mapFirestoreProviderDoc } from '../../hooks/useProviders';
import { useProviderServices } from '../../hooks/useProviderServices';
import { useProviderAvailability } from '../../hooks/useProviderAvailability';
import { submitReviewModerationReport } from '../../hooks/useDisputes';
import { getPricingModelLabel } from '../../components/dashboards/ProviderServicesManager';

const DAY_SHORT: Record<WeekdayKey, { fr: string; ar: string }> = {
  mon: { fr: 'Lun', ar: 'إثنين' },
  tue: { fr: 'Mar', ar: 'ثلاثاء' },
  wed: { fr: 'Mer', ar: 'أربعاء' },
  thu: { fr: 'Jeu', ar: 'خميس' },
  fri: { fr: 'Ven', ar: 'جمعة' },
  sat: { fr: 'Sam', ar: 'سبت' },
  sun: { fr: 'Dim', ar: 'أحد' },
};

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
  const {
    lang,
    t,
    isAr,
    firebaseUser,
    isVerified,
    allProviders,
    isLoadingProviders,
    favoriteProviderIds,
    toggleFavoriteProvider,
    setBookingProvider,
  } = useMarketplace();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [liveReviews, setLiveReviews] = useState<ProviderReview[]>([]);
  const [reportedReviewFeedback, setReportedReviewFeedback] = useState<string | null>(null);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [fetchedProvider, setFetchedProvider] = useState<VettedProvider | null>(null);
  const [isFetchingProvider, setIsFetchingProvider] = useState(false);

  const cachedProvider = useMemo(
    () => (id ? allProviders.find((p) => p.id === id || p.uid === id) ?? null : null),
    [allProviders, id]
  );

  // Targeted single-document fetch if user directly opens /providers/:id beyond the paginated first page (AUD-019)
  useEffect(() => {
    let active = true;
    if (!id || cachedProvider) {
      setFetchedProvider(null);
      setIsFetchingProvider(false);
      return;
    }
    setIsFetchingProvider(true);
    void getDoc(doc(db, 'providers', id))
      .then((snap) => {
        if (!active) return;
        setFetchedProvider(snap.exists() ? mapFirestoreProviderDoc(snap.id, snap.data()) : null);
      })
      .catch(() => {
        if (active) setFetchedProvider(null);
      })
      .finally(() => {
        if (active) setIsFetchingProvider(false);
      });
    return () => {
      active = false;
    };
  }, [id, cachedProvider]);

  const provider = cachedProvider ?? fetchedProvider;

  const { services: providerServices } = useProviderServices(provider?.id, lang);
  const { schedule: providerSchedule } = useProviderAvailability(provider?.id, lang);
  const activeServices = useMemo(
    () => providerServices.filter((s) => s.isActive),
    [providerServices]
  );
  const isFavorite = Boolean(provider && favoriteProviderIds.includes(provider.id));

  const handleReportReview = async (reviewId: string) => {
    if (!firebaseUser || !isVerified || !provider) return;
    try {
      await submitReviewModerationReport({
        reviewId,
        providerId: provider.id,
        reporterId: firebaseUser.uid,
        reason: 'Contenu inapproprié ou suspect',
        details: `Signalement de l’avis ${reviewId} depuis la fiche publique.`,
      });
      setReportedReviewFeedback(t.reviewReportedNotice);
    } catch {
      // ignore duplicate / transient failures
    }
  };

  useEffect(() => {
    setActiveImageIndex(0);
    setLiveReviews([]);
    setReportedReviewFeedback(null);
    setContactRevealed(false);
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
          const rawPhotos = Array.isArray(data.photoUrls) ? data.photoUrls : [];
          const photoUrls = rawPhotos.filter(
            (u): u is string => typeof u === 'string' && isSafeImageUrl(u)
          );
          return {
            id: d.id,
            authorName: String(data.authorName || 'Client'),
            quartier: String(data.quartier || ''),
            rating: Number(data.rating || 5),
            date: formatReviewDate(data.createdAt),
            commentFr: String(data.comment || ''),
            commentAr: String(data.comment || ''),
            ...(photoUrls.length > 0 ? { photoUrls } : {}),
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

  if (!provider && (isLoadingProviders || isFetchingProvider)) {
    return (
      <div
        aria-label={t.routeLoadingLabel}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse"
      >
        <div className="h-4 w-48 bg-slate-200 rounded" />
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-5 h-64 lg:h-80 bg-slate-200" />
          <div className="lg:col-span-7 p-6 sm:p-8 space-y-4">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-7 w-64 bg-slate-200 rounded" />
            <div className="h-4 w-52 bg-slate-100 rounded" />
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-100 rounded" />
              <div className="h-3.5 w-5/6 bg-slate-100 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
            <div className="flex gap-3 pt-4">
              <div className="h-11 flex-1 bg-slate-200 rounded-xl" />
              <div className="h-11 w-12 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
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

  const maskedPhone = maskMoroccanPhone(provider.phone);
  const providerWhatsappUrl =
    contactRevealed && maskedPhone
      ? buildWhatsAppUrl({
          phone: provider.phone,
          lang,
          providerName: displayName,
          category: t.categories[provider.category],
        })
      : '';
  const telHref =
    contactRevealed && maskedPhone
      ? `tel:${provider.phone.replace(/[^\d+]/g, '')}`
      : '';

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
            <div className="relative h-64 lg:h-80 overflow-hidden bg-slate-200">
              <img
                src={
                  provider.portfolioImages[activeImageIndex] ||
                  provider.portfolioImages[0] ||
                  DEFAULT_CATEGORY_IMAGE[provider.category]
                }
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallback = DEFAULT_CATEGORY_IMAGE[provider.category];
                  if (target.src !== fallback && !target.src.endsWith(fallback)) {
                    target.src = fallback;
                  }
                }}
              />
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-amber-800">
                    {t.categories[provider.category]}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  {provider.verifiedBadge ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.verifiedCinLabel}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>{uiText(isAr).publicUi.verificationEnCours}</span>
                    </span>
                  )}
                </div>
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
                {typeof provider.responseMinutes === 'number' && provider.responseMinutes > 0 && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      {t.responseTime} {provider.responseMinutes} {t.minutesUnit}
                    </span>
                  </span>
                )}
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

              {/* Clean Editorial Skills Row */}
              {displaySkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-700">
                  {displaySkills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
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
              <button
                type="button"
                onClick={() => {
                  void toggleFavoriteProvider(provider.id);
                }}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? t.removeFavoriteLabel : t.saveFavoriteLabel}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold rounded-xl border transition-colors cursor-pointer ${
                  isFavorite
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-600 text-rose-600' : ''}`} />
              </button>
              {maskedPhone &&
                (!contactRevealed ? (
                  <button
                    type="button"
                    data-testid="reveal-provider-phone-btn"
                    onClick={() => setContactRevealed(true)}
                    aria-label={`${uiText(isAr).publicUi.afficherLeNumeroDe} ${displayName}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-emerald-700" />
                    <span>{uiText(isAr).publicUi.afficherLeContact}</span>
                    <span className="font-mono-tabular text-slate-500 text-xs" dir="ltr">
                      {maskedPhone}
                    </span>
                  </button>
                ) : (
                  <>
                    {providerWhatsappUrl && (
                      <a
                        href={providerWhatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-700" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <a
                      href={telHref}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <Phone className="w-4 h-4 text-slate-600" />
                      <span className="font-mono-tabular" dir="ltr">
                        {provider.phone}
                      </span>
                    </a>
                  </>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Published Services Catalog (when provider has added structured services) */}
      {activeServices.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-700" />
            <span>
              {uiText(isAr).publicUi.catalogueDesPrestationsTarifs} (
              {activeServices.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeServices.map((srv) => (
              <div
                key={srv.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900 text-sm">
                      {isAr ? srv.titleAr : srv.titleFr}
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                      ~{srv.estimatedDurationMinutes} {t.minutesUnit}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isAr ? srv.descriptionAr : srv.descriptionFr}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <span className="text-xs font-bold text-emerald-800">
                    {srv.pricingModel === 'quote_required'
                      ? getPricingModelLabel('quote_required', isAr)
                      : `${getPricingModelLabel(srv.pricingModel, isAr)} · ${formatMadCurrency(srv.priceMad, lang)}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBookingProvider(provider)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                  >
                    {t.bookProviderBtn}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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

          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>{t.availabilityTitle}</span>
            </h3>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
              {WEEKDAY_KEYS.map((day) => {
                const open = providerSchedule.days[day]?.enabled;
                return (
                  <div
                    key={day}
                    className={`py-1.5 rounded-lg border font-semibold ${
                      open
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    {isAr ? DAY_SHORT[day].ar : DAY_SHORT[day].fr}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            {t.detailModalReviewsTitle} ({displayedReviews.length})
          </h2>
          {reportedReviewFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
              {reportedReviewFeedback}
            </div>
          )}
          {displayedReviews.length === 0 ? (
            <p className="text-xs text-slate-500">
              {uiText(isAr).publicUi.aucunAvisClientPubliePourLe}
            </p>
          ) : (
            <div className="space-y-3">
              {displayedReviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2"
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
                  {review.photoUrls && review.photoUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {review.photoUrls.map((url, idx) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={url}
                            alt={`Photo avis ${idx + 1}`}
                            className="w-16 h-16 rounded-lg object-cover border border-slate-200 hover:opacity-90"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{review.date}</span>
                    {firebaseUser && isVerified && (
                      <button
                        type="button"
                        onClick={() => {
                          void handleReportReview(review.id);
                        }}
                        className="text-slate-500 hover:text-rose-600 font-medium cursor-pointer"
                      >
                        {t.reviewReportBtn}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
