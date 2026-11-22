import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, LogIn, Mail, AlertCircle, CheckCircle2, Wrench } from 'lucide-react';
import type { LanguageCode } from '../utils/marketplace';
import type { Translations } from '../i18n/translations';
import {
  mapFirebaseAuthError,
  validateEmailPasswordInput,
} from '../utils/authHelpers';
import {
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
} from '../firebase';

interface AuthModalProps {
  lang: LanguageCode;
  t: Translations;
  intent: 'client' | 'provider';
  onGoogleSignIn: () => Promise<void>;
  onAuthSuccess: (intent: 'client' | 'provider') => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  lang,
  t,
  intent,
  onGoogleSignIn,
  onAuthSuccess,
  onClose,
}) => {
  const isAr = lang === 'ar';
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(
    intent === 'provider' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      await onGoogleSignIn();
      onAuthSuccess(intent);
      onClose();
    } catch (err) {
      setError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const check = validateEmailPasswordInput({
      email,
      password,
      mode,
      lang,
    });
    if (!check.valid) {
      setError(check.error || null);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(check.normalizedEmail, password);
        setPassword('');
        onAuthSuccess(intent);
        onClose();
      } else if (mode === 'signup') {
        await signUpWithEmail(check.normalizedEmail, password);
        setPassword('');
        setNotice(
          isAr
            ? 'تم إنشاء حسابك! أرسلنا رابط التحقق إلى بريدك الإلكتروني. يرجى تأكيده ثم إكمال ملفك الشخصي.'
            : 'Compte créé ! Un lien de vérification vient d’être envoyé à votre adresse e-mail.'
        );
        onAuthSuccess(intent);
      } else {
        await requestPasswordReset(check.normalizedEmail);
        setNotice(
          isAr
            ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
            : 'Un lien de réinitialisation du mot de passe a été envoyé à votre e-mail.'
        );
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              {intent === 'provider' ? (
                <Wrench className="w-3.5 h-3.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>
                {intent === 'provider'
                  ? isAr
                    ? 'فضاء المعلمين المعتمدين'
                    : 'Espace Maâlem & Artisans'
                  : t.brandName}
              </span>
            </div>
            <h2 id="auth-modal-title" className="text-xl font-bold text-slate-900">
              {mode === 'signin'
                ? isAr
                  ? 'تسجيل الدخول إلى حسابك'
                  : 'Connexion à votre espace'
                : mode === 'signup'
                ? intent === 'provider'
                  ? isAr
                    ? 'إنشاء حساب معلم / مقدم خدمة'
                    : 'Devenir Maâlem sur Moul L’Khedma'
                  : isAr
                  ? 'إنشاء حساب جديد'
                  : 'Créer un compte'
                : isAr
                ? 'استعادة كلمة المرور'
                : 'Réinitialiser le mot de passe'}
            </h2>
            <p className="text-xs text-slate-600">
              {intent === 'provider'
                ? isAr
                  ? 'انشر ملفك المهني، استقبل طلبات الزبناء في حيك، وتابع أرباحك.'
                  : 'Publiez votre profil, recevez des demandes dans votre quartier et gérez vos revenus.'
                : isAr
                ? 'احجز معلمين موثوقين وتابع طلباتك ومحادثاتك بأمان.'
                : 'Réservez des Maâlems vérifiés, suivez vos interventions et échangez en direct.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google One-Click Auth */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            void handleGoogle();
          }}
          className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-60 transition-colors shadow-2xs cursor-pointer"
        >
          <LogIn className="w-4 h-4 text-emerald-700" />
          <span>{t.googleSignInBtn}</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-medium text-slate-500 whitespace-nowrap">
            {isAr ? 'أو بالبريد الإلكتروني' : 'ou par e-mail'}
          </span>
          <div className="border-t border-slate-200 w-full" />
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
              setNotice(null);
            }}
            className={`py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'تسجيل الدخول' : 'Connexion'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setNotice(null);
            }}
            className={`py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'حساب جديد' : 'Créer un compte'}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800"
          >
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-900"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} noValidate className="space-y-3.5">
          <div>
            <label
              htmlFor="auth-modal-email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {isAr ? 'البريد الإلكتروني' : 'Adresse e-mail'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
              <input
                id="auth-modal-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.ma"
                autoComplete="email"
                className="w-full ps-9 pe-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="auth-modal-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {isAr ? 'كلمة المرور' : 'Mot de passe'}
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                      setNotice(null);
                    }}
                    className="text-[11px] font-medium text-emerald-700 hover:underline cursor-pointer"
                  >
                    {isAr ? 'نسيت كلمة المرور؟' : 'Mot de passe oublié ?'}
                  </button>
                )}
              </div>
              <input
                id="auth-modal-password"
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isAr ? '8 أحرف على الأقل' : '8 caractères minimum'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isSubmitting
              ? isAr
                ? 'جاري المعالجة...'
                : 'Chargement...'
              : mode === 'signin'
              ? isAr
                ? 'تسجيل الدخول'
                : 'Se connecter'
              : mode === 'signup'
              ? isAr
                ? 'إنشاء الحساب'
                : 'Créer mon compte'
              : isAr
              ? 'إرسال رابط الاستعادة'
              : 'Envoyer le lien'}
          </button>
        </form>
      </div>
    </div>
  );
};
