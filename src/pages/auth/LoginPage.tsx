import { uiText } from '../../i18n/uiCopy';
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { SharedAuthFields } from '../../components/SharedAuthFields';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS, sanitizeRedirectPath } from '../../app/routePaths';
import {
  mapFirebaseAuthError,
  validateEmailPasswordInput,
} from '../../utils/authHelpers';
import { requestPasswordReset, signInWithEmail } from '../../firebase';

function getRedirectBannerCopy(redirectTarget: string, isAr: boolean): string | null {
  if (!redirectTarget) return null;
  if (redirectTarget.startsWith(ROUTE_PATHS.ADMIN_ROOT)) {
    return uiText(isAr).auth.redirectAdminNotice;
  }
  if (redirectTarget.startsWith(ROUTE_PATHS.PROVIDER_ROOT)) {
    return uiText(isAr).auth.redirectProviderNotice;
  }
  return uiText(isAr).auth.redirectPersonalNotice;
}

export const LoginPage: React.FC = () => {
  const { lang, t, isAr, signInWithGoogle, handleAuthSuccess } = useMarketplace();
  const [searchParams] = useSearchParams();
  const redirectTarget = sanitizeRedirectPath(searchParams.get('redirect'), '');
  const redirectNotice = getRedirectBannerCopy(redirectTarget, isAr);

  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      handleAuthSuccess('client', false, redirectTarget || undefined);
    } catch (err) {
      setError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const check = validateEmailPasswordInput({ email, password, mode, lang });
    if (!check.valid) {
      setError(check.error || null);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(check.normalizedEmail, password);
        setPassword('');
        handleAuthSuccess('client', false, redirectTarget || undefined);
      } else {
        await requestPasswordReset(check.normalizedEmail);
        setNotice(uiText(isAr).auth.unLienDeReinitialisationDuMot);
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 mx-auto">
            <LogIn className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.loginPageTitle}</h1>
          <p className="text-xs text-slate-600">{t.loginPageSubtitle}</p>
        </div>

        {redirectNotice && (
          <div
            role="status"
            data-testid="login-redirect-banner"
            className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5"
          >
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>{redirectNotice}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

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
          <SharedAuthFields
            lang={lang}
            emailId="login-email"
            passwordId="login-password"
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            showPasswordField={mode === 'signin'}
            passwordAutoComplete="current-password"
            required
            inputVariant="subtle"
            onForgotPassword={() => setMode('reset')}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            {mode === 'signin'
              ? uiText(isAr).auth.seConnecter
              : uiText(isAr).auth.envoyerLeLienDeReinitialisation}
          </button>

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="w-full min-h-[40px] text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {uiText(isAr).auth.retourALaConnexion}
            </button>
          )}
        </form>

        <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-600 space-y-2">
          <p>
            {uiText(isAr).auth.pasEncoreDeCompte}{' '}
            <Link
              to={ROUTE_PATHS.REGISTER}
              className="font-semibold text-emerald-700 hover:underline"
            >
              {uiText(isAr).common.creerUnCompte}
            </Link>
          </p>
          <p className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t.firestoreSyncBadge}</span>
          </p>
        </div>
      </div>
    </section>
  );
};
