import { uiText } from '../../i18n/uiCopy';
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Layers, Lock, Mail, UserCheck, Wrench } from 'lucide-react';
import type { UserRole } from '../../utils/marketplace';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS } from '../../app/routePaths';
import {
  mapFirebaseAuthError,
  persistTermsAcceptedIntent,
  validateEmailPasswordInput,
} from '../../utils/authHelpers';
import { signUpWithEmail } from '../../firebase';

export const RegisterPage: React.FC = () => {
  const { lang, t, isAr, setSignupRoleIntent, signInWithGoogle, handleAuthSuccess } =
    useMarketplace();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const initialRole: UserRole =
    roleParam === 'provider' || roleParam === 'both' ? roleParam : 'client';

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    if (!termsAccepted) {
      setError(t.termsConsentRequiredError);
      return;
    }
    persistTermsAcceptedIntent();
    setSignupRoleIntent(selectedRole);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      handleAuthSuccess(selectedRole, false);
    } catch (err) {
      setError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError(t.termsConsentRequiredError);
      return;
    }

    const check = validateEmailPasswordInput({ email, password, mode: 'signup', lang });
    if (!check.valid) {
      setError(check.error || null);
      return;
    }

    setIsSubmitting(true);
    try {
      persistTermsAcceptedIntent();
      setSignupRoleIntent(selectedRole);
      await signUpWithEmail(check.normalizedEmail, password, selectedRole);
      setPassword('');
      handleAuthSuccess(selectedRole, true);
    } catch (err) {
      setError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-lg mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-xl font-bold text-slate-900">{t.registerPageTitle}</h1>
          <p className="text-xs text-slate-600">{t.registerPageSubtitle}</p>
        </div>

        {/* Account Role Selector */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              {
                role: 'client' as const,
                icon: UserCheck,
                label: uiText(isAr).common.client,
              },
              {
                role: 'provider' as const,
                icon: Wrench,
                label: uiText(isAr).common.maalem,
              },
              {
                role: 'both' as const,
                icon: Layers,
                label: uiText(isAr).auth.lesDeux,
              },
            ] as const
          ).map(({ role, icon: Icon, label }) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                selectedRole === role
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4 text-emerald-700" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Law 09-08 / Terms & Privacy Explicit Consent */}
        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (e.target.checked) setError(null);
            }}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 shrink-0"
          />
          <span className="leading-relaxed">
            {t.termsConsentLabel}{' '}
            <Link
              to={ROUTE_PATHS.TERMS}
              className="text-emerald-700 font-semibold hover:underline"
            >
              {uiText(isAr).common.cgu}
            </Link>{' '}
            ·{' '}
            <Link
              to={ROUTE_PATHS.PRIVACY}
              className="text-emerald-700 font-semibold hover:underline"
            >
              {uiText(isAr).common.confidentialiteLoi0908}
            </Link>
          </span>
        </label>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            void handleGoogle();
          }}
          className="w-full min-h-[44px] py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {t.googleSignInBtn}
        </button>

        <div className="relative flex items-center justify-center text-[11px] text-slate-400">
          <span className="bg-white px-2 relative z-10">
            {uiText(isAr).auth.ouParAdresseEMail}
          </span>
          <span className="absolute inset-x-0 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700">
              {uiText(isAr).auth.adresseEMail}
            </label>
            <div className="relative" dir="ltr">
              <Mail className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
              <input
                id="reg-email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.ma"
                autoComplete="email"
                className="w-full min-h-[44px] ps-10 pe-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700">
              {uiText(isAr).auth.motDePasse8CaracteresMinimum}
            </label>
            <div className="relative" dir="ltr">
              <Lock className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full min-h-[44px] ps-10 pe-11 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? uiText(isAr).auth.masquerMotDePasse
                    : uiText(isAr).auth.afficherMotDePasse
                }
                aria-pressed={showPassword}
                className="absolute top-1/2 -translate-y-1/2 end-1 inline-flex items-center justify-center w-9 h-9 text-slate-500 hover:text-slate-800 rounded-md cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            {uiText(isAr).auth.creerMonCompte}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-600">
          {uiText(isAr).auth.dejaInscrit}{' '}
          <Link to={ROUTE_PATHS.LOGIN} className="font-semibold text-emerald-700 hover:underline">
            {uiText(isAr).common.connexion}
          </Link>
        </div>
      </div>
    </section>
  );
};
