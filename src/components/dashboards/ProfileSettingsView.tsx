import { uiText } from '../../i18n/uiCopy';
import React from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, LogIn } from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  LanguageCode,
  MoroccanCity,
  ServiceCategory,
  UserProfileRecord,
  UserRole,
} from '../../utils/marketplace';
import type { Translations } from '../../i18n/translations';
import { OnboardingForm } from '../OnboardingModal';

interface ProfileSettingsViewProps {
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  currentProfile: UserProfileRecord | null;
  isPureProvider: boolean;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onSaveProfile: (profileData: {
    role: UserRole;
    fullName: string;
    phone: string;
    city: MoroccanCity;
    neighborhood: string;
    languagePref: LanguageCode;
    specialty: ServiceCategory | 'none';
    hourlyRateMad: number;
    bio: string;
  }) => Promise<void>;
  onOpenAuth: () => void;
  onBack: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  lang,
  t,
  firebaseUser,
  currentProfile,
  isPureProvider,
  onGoogleSignIn,
  onSignOut,
  onDeleteAccount,
  onSaveProfile,
  onOpenAuth,
  onBack,
}) => {
  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  if (!firebaseUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-5 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900">
              {uiText(isAr).profile.connectezVousPourGererVotreProfil}
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {t.localPreviewNotice}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{uiText(isAr).profile.connexionInscription}</span>
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {uiText(isAr).profile.retourALAccueil}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <BackIcon className="w-4 h-4" />
          <span>
            {isPureProvider
              ? uiText(isAr).profile.retourAMonEspaceMaalem
              : uiText(isAr).profile.retourAMonTableauDeBord}
          </span>
        </button>
      </div>

      <OnboardingForm
        lang={lang}
        t={t}
        firebaseUser={firebaseUser}
        currentProfile={currentProfile}
        onGoogleSignIn={onGoogleSignIn}
        onSignOut={onSignOut}
        onDeleteAccount={onDeleteAccount}
        onSaveProfile={onSaveProfile}
      />
    </div>
  );
};
