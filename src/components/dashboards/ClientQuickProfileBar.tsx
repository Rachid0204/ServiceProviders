import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { uiText } from '../../i18n/uiCopy';
import {
  MOROCCAN_CITIES,
  validateUserProfileInput,
  type LanguageCode,
  type MoroccanCity,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import type { SaveProfileInput } from '../../hooks/useMarketplaceAuth';
import { mapProfileSaveError } from '../../utils/authHelpers';

interface ClientQuickProfileBarProps {
  lang: LanguageCode;
  t: Translations;
  initialDisplayName: string;
  onQuickSaveClientProfile: (input: SaveProfileInput) => Promise<void>;
}

export const ClientQuickProfileBar: React.FC<ClientQuickProfileBarProps> = ({
  lang,
  t,
  initialDisplayName,
  onQuickSaveClientProfile,
}) => {
  const isAr = lang === 'ar';
  const [quickName, setQuickName] = useState(initialDisplayName);
  const [quickPhone, setQuickPhone] = useState('+2126');
  const [quickCity, setQuickCity] = useState<MoroccanCity>('Casablanca');
  const [quickQuartier, setQuickQuartier] = useState('');
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});
  const [quickSaveError, setQuickSaveError] = useState<string | null>(null);
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  const handleQuickProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickSaveError(null);
    const check = validateUserProfileInput({
      role: 'client',
      fullName: quickName,
      phone: quickPhone,
      city: quickCity,
      neighborhood: quickQuartier,
      languagePref: lang,
    });
    if (!check.valid) {
      setQuickErrors(check.errors as Record<string, string>);
      return;
    }
    setQuickErrors({});
    setIsQuickSaving(true);
    try {
      await onQuickSaveClientProfile({
        role: 'client',
        fullName: quickName.trim(),
        phone: check.normalizedPhone,
        city: quickCity,
        neighborhood: quickQuartier.trim(),
        languagePref: lang,
        specialty: 'none',
        hourlyRateMad: 0,
        bio: '',
      });
    } catch (err) {
      setQuickSaveError(mapProfileSaveError(err, lang));
    } finally {
      setIsQuickSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleQuickProfileSubmit}
      noValidate
      className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-start gap-2.5">
        <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-bold text-emerald-950">
            {uiText(isAr).client.completezVosCoordonneesEn15Secondes}
          </h2>
          <p className="text-xs text-emerald-800 mt-0.5">
            {uiText(isAr).client.vosInformationsSerontPreRempliesAutomatiquement}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <input
            type="text"
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            placeholder={t.fullNamePlaceholder}
            className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-lg"
          />
          {quickErrors.fullName && (
            <p className="text-[11px] text-rose-600 mt-0.5">{quickErrors.fullName}</p>
          )}
        </div>
        <div>
          <input
            type="tel"
            dir="ltr"
            value={quickPhone}
            onChange={(e) => setQuickPhone(e.target.value)}
            placeholder="+212661234567"
            className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-emerald-200 rounded-lg"
          />
          {quickErrors.phone && (
            <p className="text-[11px] text-rose-600 mt-0.5">{quickErrors.phone}</p>
          )}
        </div>
        <div>
          <select
            value={quickCity}
            onChange={(e) => setQuickCity(e.target.value as MoroccanCity)}
            className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-lg"
          >
            {MOROCCAN_CITIES.map((c) => (
              <option key={c} value={c}>
                {t.cities[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <input
            type="text"
            value={quickQuartier}
            onChange={(e) => setQuickQuartier(e.target.value)}
            placeholder={t.neighborhoodPlaceholder}
            className="w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-lg"
          />
          {quickErrors.neighborhood && (
            <p className="text-[11px] text-rose-600 mt-0.5">{quickErrors.neighborhood}</p>
          )}
        </div>
      </div>

      {quickSaveError && <p className="text-xs text-rose-700">{quickSaveError}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isQuickSaving}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-60 cursor-pointer"
        >
          {isQuickSaving
            ? t.savingProfileBtn
            : uiText(isAr).client.enregistrerMesCoordonnees}
        </button>
      </div>
    </form>
  );
};
