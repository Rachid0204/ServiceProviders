import { uiText } from '../../i18n/uiCopy';
import React from 'react';
import { Camera, Plus, Trash2 } from 'lucide-react';
import {
  CATEGORY_SUGGESTED_SKILLS,
  type LanguageCode,
  type ServiceCategory,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';

interface ProviderCardPhotosSectionProps {
  lang: LanguageCode;
  t: Translations;
  cardPhotos: string[];
  setCardPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  isUploadingPhoto: boolean;
  onUploadPhoto: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const ProviderCardPhotosSection: React.FC<ProviderCardPhotosSectionProps> = ({
  lang,
  t,
  cardPhotos,
  setCardPhotos,
  isUploadingPhoto,
  onUploadPhoto,
}) => {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {uiText(isAr).provider.photoDeCouvertureGalerieTravaux}
          </h2>
          <p className="text-xs text-slate-500">
            {uiText(isAr).provider.la1erePhotoApparaitEnCouverture}
          </p>
        </div>
        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer">
          <Camera className="w-4 h-4" />
          <span>
            {isUploadingPhoto
              ? uiText(isAr).common.upload
              : uiText(isAr).provider.televerserUnePhoto}
          </span>
          <input
            type="file"
            accept="image/*"
            disabled={isUploadingPhoto || cardPhotos.length >= 6}
            onChange={onUploadPhoto}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {cardPhotos.map((imgUrl, idx) => (
          <div
            key={`${imgUrl}-${idx}`}
            className={`relative aspect-4/3 rounded-xl overflow-hidden border-2 bg-slate-100 ${
              idx === 0 ? 'border-emerald-600' : 'border-slate-200'
            }`}
          >
            <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
            {idx === 0 ? (
              <span className="absolute bottom-1.5 start-1.5 px-2 py-0.5 text-[10px] font-bold bg-emerald-700 text-white rounded-md">
                {uiText(isAr).provider.couverture}
              </span>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setCardPhotos((prev) => [imgUrl, ...prev.filter((u) => u !== imgUrl)])
                }
                className="absolute bottom-1.5 start-1.5 px-2 py-0.5 text-[10px] font-semibold bg-slate-900/80 text-white hover:bg-emerald-700 rounded-md cursor-pointer"
              >
                {uiText(isAr).provider.mettreEnUne}
              </button>
            )}
            {cardPhotos.length > 1 && (
              <button
                type="button"
                onClick={() => setCardPhotos((prev) => prev.filter((u) => u !== imgUrl))}
                aria-label={t.removePhotoBtn}
                className="absolute top-1.5 end-1.5 p-1 rounded-md bg-slate-900/75 text-white hover:bg-rose-700 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface ProviderCardSkillsSectionProps {
  lang: LanguageCode;
  cardCategory: ServiceCategory;
  cardSkills: string[];
  setCardSkills: React.Dispatch<React.SetStateAction<string[]>>;
  newSkillInput: string;
  setNewSkillInput: (v: string) => void;
  onAddSkill: (skillText?: string) => void;
}

export const ProviderCardSkillsSection: React.FC<ProviderCardSkillsSectionProps> = ({
  lang,
  cardCategory,
  cardSkills,
  setCardSkills,
  newSkillInput,
  setNewSkillInput,
  onAddSkill,
}) => {
  const isAr = lang === 'ar';
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700">
        {uiText(isAr).provider.prestationsCompetencesMax10}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {cardSkills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium rounded-lg"
          >
            <span>{skill}</span>
            <button
              type="button"
              onClick={() => setCardSkills((prev) => prev.filter((s) => s !== skill))}
              className="text-emerald-700 hover:text-rose-600 cursor-pointer"
              aria-label={`Remove ${skill}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] text-slate-500">
          {uiText(isAr).provider.suggestions}
        </span>
        {CATEGORY_SUGGESTED_SKILLS[cardCategory]
          .filter((s) => !cardSkills.includes(s))
          .map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => onAddSkill(sug)}
              className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer"
            >
              + {sug}
            </button>
          ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          maxLength={64}
          value={newSkillInput}
          onChange={(e) => setNewSkillInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddSkill();
            }
          }}
          placeholder={uiText(isAr).provider.ajouterUneCompetence}
          className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <button
          type="button"
          onClick={() => onAddSkill()}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{uiText(isAr).provider.ajouter}</span>
        </button>
      </div>
    </div>
  );
};
