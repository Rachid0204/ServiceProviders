import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  CheckCircle2,
  RefreshCw,
  LogOut,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { LanguageCode, UserRole } from '../utils/marketplace';
import { resendVerificationEmail } from '../firebase';
import { mapFirebaseAuthError } from '../utils/authHelpers';

interface VerifyEmailViewProps {
  lang: LanguageCode;
  firebaseUser: User;
  roleIntent: UserRole | null;
  onRefreshVerification: () => Promise<boolean>;
  onVerified: () => void;
  onSignOut: () => Promise<void>;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({
  lang,
  firebaseUser,
  roleIntent,
  onRefreshVerification,
  onVerified,
  onSignOut,
}) => {
  const isAr = lang === 'ar';
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [justVerified, setJustVerified] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkVerification = useCallback(
    async (manual = false) => {
      if (manual) {
        setIsChecking(true);
        setError(null);
        setNotice(null);
      }
      try {
        const verified = await onRefreshVerification();
        if (verified) {
          setJustVerified(true);
          window.setTimeout(() => {
            onVerified();
          }, 900);
        } else if (manual) {
          setNotice(
            isAr
              ? 'لم يتم تفعيل البريد بعد. افتح رسالتنا في بريدك الإلكتروني واضغط على رابط التفعيل، وسيتم تحويلك تلقائياً.'
              : 'E-mail pas encore confirmé. Cliquez sur le lien reçu dans votre boîte de réception (vérifiez aussi les spams) : la redirection est automatique.'
          );
        }
      } catch (err) {
        if (manual) setError(mapFirebaseAuthError(err, lang));
      } finally {
        if (manual) setIsChecking(false);
      }
    },
    [onRefreshVerification, onVerified, isAr, lang]
  );

  // Automatic background polling (every 3.5s while tab visible) + instant check on focus/return
  useEffect(() => {
    if (justVerified) return;

    // Immediate check if the user returned via Firebase's Continue URL (?verified=1)
    if (typeof window !== 'undefined' && window.location.search.includes('verified=1')) {
      void checkVerification(false);
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkVerification(false);
      }
    }, 3500);

    const onFocus = () => {
      void checkVerification(false);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkVerification(false);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [checkVerification, justVerified]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = window.setTimeout(() => setCooldownSec((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [cooldownSec]);

  const handleResend = async () => {
    if (cooldownSec > 0 || isResending) return;
    setError(null);
    setNotice(null);
    setIsResending(true);
    try {
      await resendVerificationEmail(roleIntent ?? undefined);
      setCooldownSec(60);
      setNotice(
        isAr
          ? 'تم إرسال رابط تفعيل جديد إلى بريدك الإلكتروني.'
          : 'Un nouveau lien de vérification vient d’être envoyé à votre adresse e-mail.'
      );
    } catch (err) {
      setError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsResending(false);
    }
  };

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const targetLabel =
    roleIntent === 'provider'
      ? isAr
        ? 'لوحة المعلم وإعداد بطاقتك المهنية'
        : 'votre Espace Maâlem'
      : isAr
      ? 'لوحة الزبون الخاصة بك'
      : 'votre Espace Client';

  return (
    <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* 3-Step Visual Progress Bar */}
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{isAr ? '1. إنشاء الحساب' : '1. Compte créé'}</span>
          </div>
          <div className="flex-1 h-0.5 bg-emerald-200 rounded" />
          <div
            className={`flex items-center gap-1.5 ${
              justVerified ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {justVerified ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <Mail className="w-4 h-4 shrink-0" />
            )}
            <span>{isAr ? '2. تفعيل البريد' : '2. Vérifier l’e-mail'}</span>
          </div>
          <div
            className={`flex-1 h-0.5 rounded ${
              justVerified ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />
          <div
            className={`flex items-center gap-1.5 ${
              justVerified ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{isAr ? '3. لوحة التحكم' : '3. Tableau de bord'}</span>
          </div>
        </div>

        {justVerified ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? 'تم تفعيل بريدك الإلكتروني بنجاح!' : 'Adresse e-mail vérifiée avec succès !'}
            </h1>
            <p className="text-sm text-slate-600">
              {isAr
                ? `جاري تحويلك تلقائياً إلى ${targetLabel}...`
                : `Redirection automatique vers ${targetLabel}...`}
            </p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2.5 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {isAr
                  ? 'فعّل بريدك الإلكتروني للمتابعة'
                  : 'Vérifiez votre boîte e-mail'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                {isAr ? (
                  <>
                    أرسلنا رابط التفعيل إلى{' '}
                    <span className="font-semibold text-slate-900" dir="ltr">
                      {firebaseUser.email}
                    </span>
                    . بمجرد الضغط على الرابط، سيتم تحويلك تلقائياً إلى {targetLabel}.
                  </>
                ) : (
                  <>
                    Nous avons envoyé un lien de confirmation à{' '}
                    <span className="font-semibold text-slate-900" dir="ltr">
                      {firebaseUser.email}
                    </span>
                    . Dès que vous cliquez sur le lien, cette page vous redirige automatiquement
                    vers {targetLabel}.
                  </>
                )}
              </p>
            </div>

            {/* Live auto-check status indicator */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2.5 text-xs text-slate-600">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-700 animate-spin shrink-0" />
              <span>
                {isAr
                  ? 'في انتظار تأكيد البريد الإلكتروني (تحقق تلقائي)...'
                  : 'Vérification automatique en cours — laissez cet onglet ouvert ou cliquez sur « Continuer ».'}
              </span>
            </div>

            {notice && (
              <div
                role="status"
                className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-900"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{notice}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800"
              >
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={isChecking}
                onClick={() => {
                  void checkVerification(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer"
              >
                <span>
                  {isChecking
                    ? isAr
                      ? 'جاري التحقق...'
                      : 'Vérification...'
                    : isAr
                    ? 'لقد فعّلت بريدي — الدخول إلى لوحة التحكم'
                    : 'J’ai vérifié mon e-mail — Accéder au tableau de bord'}
                </span>
                <ArrowIcon className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isResending || cooldownSec > 0}
                  onClick={() => {
                    void handleResend();
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {cooldownSec > 0
                    ? isAr
                      ? `إعادة الإرسال بعد ${cooldownSec} ث`
                      : `Renvoyer dans ${cooldownSec}s`
                    : isAr
                    ? 'إعادة إرسال رابط التفعيل'
                    : 'Renvoyer l’e-mail'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void onSignOut();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isAr ? 'استخدام حساب آخر' : 'Changer de compte'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              {isAr
                ? 'لم تصلك الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam / Promotions).'
                : 'Vous ne trouvez pas l’e-mail ? Pensez à vérifier votre dossier Courrier indésirable (Spam).'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
