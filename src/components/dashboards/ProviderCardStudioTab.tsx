import { uiText } from '../../i18n/uiCopy';
import React from 'react';
import { AlertCircle, Award, CheckCircle2, Navigation } from 'lucide-react';
import {
  DEFAULT_CATEGORY_IMAGE,
  MOROCCAN_CITIES,
  SERVICE_CATEGORIES,
  type LanguageCode,
  type MoroccanCity,
  type ServiceCategory,
  type VettedProvider,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import type { useProviderCardStudio } from '../../hooks/useProviderCardStudio';
import { ProviderCard } from '../ProviderCard';
import {
  ProviderCardPhotosSection,
  ProviderCardSkillsSection,
} from './ProviderCardMediaSkills';

interface ProviderCardStudioTabProps {
  lang: LanguageCode;
  t: Translations;
  ownProvider: VettedProvider | null;
  studio: ReturnType<typeof useProviderCardStudio>;
}

export const ProviderCardStudioTab: React.FC<ProviderCardStudioTabProps> = ({
  lang,
  t,
  ownProvider,
  studio,
}) => {
  const isAr = lang === 'ar';
  const {
    cardFullName,
    setCardFullName,
    cardPhone,
    setCardPhone,
    cardCategory,
    setCardCategory,
    cardCity,
    setCardCity,
    cardQuartier,
    setCardQuartier,
    isLocatingCard,
    cardExpYears,
    setCardExpYears,
    cardDiploma,
    setCardDiploma,
    cardHourlyRate,
    setCardHourlyRate,
    cardVisitFee,
    setCardVisitFee,
    cardAvailableNow,
    setCardAvailableNow,
    cardBio,
    setCardBio,
    cardSkills,
    setCardSkills,
    newSkillInput,
    setNewSkillInput,
    cardPhotos,
    setCardPhotos,
    isUploadingPhoto,
    isSavingCard,
    cardFieldErrors,
    cardNotice,
    livePreviewProvider,
    completeness,
    handleUseGpsForCard,
    handleAddSkill,
    handleCardPhotoUpload,
    handleSaveCardSubmit,
  } = studio;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <form
        onSubmit={handleSaveCardSubmit}
        noValidate
        className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xs"
      >
        {/* Completeness Meter */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900">
              {uiText(isAr).provider.completudeDeVotreFicheMaalem}
            </span>
            <span className="font-bold text-emerald-700 tabular-nums">{completeness.percent}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {(
              [
                { ok: completeness.checks.hasIdentity, fr: 'Nom & Tél', ar: 'الاسم والهاتف' },
                { ok: completeness.checks.hasLocation, fr: 'Ville & Quartier', ar: 'المدينة والحي' },
                {
                  ok: completeness.checks.hasExperienceAndBio,
                  fr: 'Expérience & Bio',
                  ar: 'الخبرة والنبذة',
                },
                { ok: completeness.checks.hasCustomPhoto, fr: 'Photo réelle', ar: 'صورة حقيقية' },
                { ok: completeness.checks.hasSkills, fr: 'Compétences (2+)', ar: 'المهارات (+2)' },
              ] as const
            ).map((item) => (
              <span
                key={item.fr}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${
                  item.ok
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>{isAr ? item.ar : item.fr}</span>
              </span>
            ))}
          </div>
        </div>

        {cardNotice && (
          <div
            role={cardNotice.type === 'error' ? 'alert' : 'status'}
            className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
              cardNotice.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            }`}
          >
            {cardNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{cardNotice.text}</span>
          </div>
        )}

        <ProviderCardPhotosSection
          lang={lang}
          t={t}
          cardPhotos={cardPhotos}
          setCardPhotos={setCardPhotos}
          isUploadingPhoto={isUploadingPhoto}
          onUploadPhoto={handleCardPhotoUpload}
        />

        {/* Section B: Identity & Trade */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.fullNameLabel} <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={cardFullName}
              onChange={(e) => setCardFullName(e.target.value)}
              placeholder={uiText(isAr).provider.exMaalemRachidElAlami}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {cardFieldErrors.fullName && (
              <p className="text-xs text-rose-600 mt-1">{cardFieldErrors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.phoneLabel} <span className="text-rose-600">*</span>
            </label>
            <input
              type="tel"
              dir="ltr"
              value={cardPhone}
              onChange={(e) => setCardPhone(e.target.value)}
              placeholder="+212661234567"
              className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {cardFieldErrors.phone && (
              <p className="text-xs text-rose-600 mt-1">{cardFieldErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.specialtyLabel} <span className="text-rose-600">*</span>
            </label>
            <select
              value={cardCategory}
              onChange={(e) => {
                const nextCat = e.target.value as ServiceCategory;
                setCardCategory(nextCat);
                setCardPhotos((prev) =>
                  prev.length === 1 && Object.values(DEFAULT_CATEGORY_IMAGE).includes(prev[0])
                    ? [DEFAULT_CATEGORY_IMAGE[nextCat]]
                    : prev
                );
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.categories[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {uiText(isAr).provider.anneesDExperience}
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={cardExpYears}
              onChange={(e) => setCardExpYears(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Section C: Location & GPS */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              {uiText(isAr).provider.localisationSecteurDIntervention}
            </span>
            <button
              type="button"
              disabled={isLocatingCard}
              onClick={handleUseGpsForCard}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>
                {isLocatingCard
                  ? t.nearMeLocating
                  : uiText(isAr).provider.utiliserMaPositionGps}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.cityLabel} <span className="text-rose-600">*</span>
              </label>
              <select
                value={cardCity}
                onChange={(e) => setCardCity(e.target.value as MoroccanCity)}
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
              <input
                type="text"
                value={cardQuartier}
                onChange={(e) => setCardQuartier(e.target.value)}
                placeholder={t.neighborhoodPlaceholder}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {cardFieldErrors.neighborhood && (
                <p className="text-xs text-rose-600 mt-1">{cardFieldErrors.neighborhood}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section D: Diploma & Rates */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {uiText(isAr).provider.diplomeQualificationProfessionnelleOptionnel}
              </span>
            </label>
            <input
              type="text"
              maxLength={160}
              value={cardDiploma}
              onChange={(e) => setCardDiploma(e.target.value)}
              placeholder={
                uiText(isAr).provider.exDiplomeTechnicienIstaOfppt10
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.hourlyRateLabel} (DH) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              min={50}
              max={50000}
              value={cardHourlyRate}
              onChange={(e) => setCardHourlyRate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.calloutFeeLabel} (DH)
            </label>
            <input
              type="number"
              min={0}
              max={10000}
              value={cardVisitFee}
              onChange={(e) => setCardVisitFee(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-end">
            <label className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cardAvailableNow}
                onChange={(e) => setCardAvailableNow(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-700"
              />
              <span>{t.availableNowText}</span>
            </label>
          </div>
        </div>

        {/* Section E: Bio & Skills */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.bioLabel} <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              maxLength={600}
              value={cardBio}
              onChange={(e) => setCardBio(e.target.value)}
              placeholder={t.bioPlaceholder}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {cardFieldErrors.bio && (
              <p className="text-xs text-rose-600 mt-1">{cardFieldErrors.bio}</p>
            )}
          </div>

          <ProviderCardSkillsSection
            lang={lang}
            cardCategory={cardCategory}
            cardSkills={cardSkills}
            setCardSkills={setCardSkills}
            newSkillInput={newSkillInput}
            setNewSkillInput={setNewSkillInput}
            onAddSkill={handleAddSkill}
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSavingCard}
            className="px-6 py-3 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isSavingCard
              ? t.savingProfileBtn
              : ownProvider
              ? uiText(isAr).provider.enregistrerMaFicheMaalem
              : uiText(isAr).provider.publierMaFicheMaalem}
          </button>
        </div>
      </form>

      {/* Right Column: Sticky Live Preview */}
      <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            {uiText(isAr).provider.apercuEnDirectDeVotreCarte}
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {uiText(isAr).provider.tempsReel}
          </span>
        </div>
        <div className="pointer-events-none select-none opacity-95">
          <ProviderCard
            provider={livePreviewProvider}
            lang={lang}
            t={t}
            onViewDetails={() => {}}
            onBookProvider={() => {}}
          />
        </div>
      </div>
    </div>
  );
};
