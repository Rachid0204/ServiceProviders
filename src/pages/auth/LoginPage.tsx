import { uiText } from '../../i18n/uiCopy';
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS, sanitizeRedirectPath } from '../../app/routePaths';
import {
  mapFirebaseAuthError,
  validateEmailPasswordInput,
} from '../../utils/authHelpers';
import { requestPasswordReset, signInWithEmail } from '../../firebase';

export const LoginPage: React.FC = () => {
  const { lang, t, isAr, signInWithGoogle, handleAuthSuccess } = useMarketplace();
  const [searchParams] = useSearchParams();
  const redirectTarget = sanitizeRedirectPath(searchParams.get('redirect'), '');

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
        setNotice(
          uiText(isAr).auth.unLienDeReinitialisationDuMot
        );
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
          className="w-full py-2.5 px-4 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60 cursor-pointer"
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
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700">
              {uiText(isAr).auth.adresseEMail}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.ma"
                className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {mode === 'signin' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {uiText(isAr).auth.motDePasse}
                </label>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-[11px] text-emerald-700 hover:underline cursor-pointer"
                >
                  {uiText(isAr).auth.motDePasseOublie}
                </button>
              </div>
              <input
                id="login-password"
                type="password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            {mode === 'signin'
              ? uiText(isAr).auth.seConnecter
              : uiText(isAr).auth.envoyerLeLienDeReinitialisation}
          </button>

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="w-full text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
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
