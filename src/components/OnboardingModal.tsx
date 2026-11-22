import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Wrench,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Mail,
  Trash2,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  MOROCCAN_CITIES,
  SERVICE_CATEGORIES,
  validateUserProfileInput,
  type LanguageCode,
  type MoroccanCity,
  type ServiceCategory,
  type UserProfileRecord,
  type UserRole,
} from '../utils/marketplace';
import type { Translations } from '../i18n/translations';
import {
  mapFirebaseAuthError,
  mapProfileSaveError,
  isVerifiedAuthUser,
  getInitialOnboardingFormState,
  validateEmailPasswordInput,
} from '../utils/authHelpers';
import {
  resendVerificationEmail,
  reloadCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
} from '../firebase';

interface OnboardingFormProps {
  lang: LanguageCode;
  t: Translations;
  firebaseUser: User | null;
  currentProfile: UserProfileRecord | null;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
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
  onClose?: () => void;
  isModal?: boolean;
}

export const OnboardingForm: React.FC<OnboardingFormProps> = ({
  lang,
  t,
  firebaseUser,
  currentProfile,
  onGoogleSignIn,
  onSignOut,
  onDeleteAccount,
  onSaveProfile,
  onClose,
  isModal = false,
}) => {
  const initial = getInitialOnboardingFormState(currentProfile, firebaseUser, lang);
  const [role, setRole] = useState<UserRole>(initial.role);
  const [fullName, setFullName] = useState<string>(initial.fullName);
  const [phone, setPhone] = useState<string>(initial.phone);
  const [city, setCity] = useState<MoroccanCity>(initial.city);
  const [neighborhood, setNeighborhood] = useState<string>(initial.neighborhood);
  const [languagePref, setLanguagePref] = useState<LanguageCode>(initial.languagePref);
  const [specialty, setSpecialty] = useState<ServiceCategory | 'none'>(initial.specialty);
  const [hourlyRateMad, setHourlyRateMad] = useState<number>(initial.hourlyRateMad);
  const [bio, setBio] = useState<string>(initial.bio);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfoNotice, setAuthInfoNotice] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const isUnverifiedAccount = Boolean(firebaseUser && !isVerifiedAuthUser(firebaseUser));

  useEffect(() => {
    setLanguagePref(lang);
  }, [lang]);

  useEffect(() => {
    const next = getInitialOnboardingFormState(currentProfile, firebaseUser, lang);
    setRole(next.role);
    setFullName(next.fullName);
    setPhone(next.phone);
    setCity(next.city);
    setNeighborhood(next.neighborhood);
    setLanguagePref(next.languagePref);
    setSpecialty(next.specialty);
    setHourlyRateMad(next.hourlyRateMad);
    setBio(next.bio);
    setErrors({});
    setSaveSuccess(false);
    setVerificationNotice(null);
    setConfirmDeleteAccount(false);
  }, [currentProfile, firebaseUser?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setAuthError(null);

    const isProviderCapable = role === 'provider' || role === 'both';
    const validation = validateUserProfileInput({
      role,
      fullName,
      phone,
      city,
      neighborhood,
      languagePref,
      specialty: isProviderCapable ? specialty : 'none',
      hourlyRateMad: isProviderCapable ? hourlyRateMad : undefined,
      bio: isProviderCapable ? bio : undefined,
    });

    if (!validation.valid) {
      setErrors(validation.errors as Record<string, string>);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      await onSaveProfile({
        role,
        fullName: fullName.trim(),
        phone: validation.normalizedPhone,
        city,
        neighborhood: neighborhood.trim(),
        languagePref,
        specialty: isProviderCapable ? specialty : 'none',
        hourlyRateMad: isProviderCapable ? Number(hourlyRateMad) : 0,
        bio: bio.trim(),
      });
      setPhone(validation.normalizedPhone);
      setSaveSuccess(true);
    } catch (err) {
      setAuthError(mapProfileSaveError(err, lang));
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoogleClick = async () => {
    setAuthError(null);
    setAuthInfoNotice(null);
    try {
      await onGoogleSignIn();
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err, lang));
    }
  };

  const handleSignOutClick = async () => {
    setAuthError(null);
    setAuthInfoNotice(null);
    try {
      await onSignOut();
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err, lang));
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthInfoNotice(null);
    const check = validateEmailPasswordInput({
      email: authEmail,
      password: authPassword,
      mode: emailAuthMode,
      lang,
    });
    if (!check.valid) {
      setAuthError(check.error || null);
      return;
    }

    setIsEmailSubmitting(true);
    try {
      if (emailAuthMode === 'signin') {
        await signInWithEmail(check.normalizedEmail, authPassword);
        setAuthPassword('');
        setShowEmailAuth(false);
      } else if (emailAuthMode === 'signup') {
        await signUpWithEmail(check.normalizedEmail, authPassword);
        setAuthPassword('');
        setShowEmailAuth(false);
        setAuthInfoNotice(
          lang === 'ar'
            ? 'تم إنشاء الحساب وإرسال رابط التحقق إلى بريدك الإلكتروني.'
            : 'Compte créé ! Un lien de vérification vient d’être envoyé à votre e-mail.'
        );
      } else {
        await requestPasswordReset(check.normalizedEmail);
        setAuthInfoNotice(
          lang === 'ar'
            ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
            : 'Un e-mail de réinitialisation du mot de passe a été envoyé.'
        );
      }
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const handleConfirmAccountDelete = async () => {
    if (!onDeleteAccount) return;
    setAuthError(null);
    setIsDeletingAccount(true);
    try {
      await onDeleteAccount();
      setConfirmDeleteAccount(false);
      setAuthInfoNotice(
        lang === 'ar'
          ? 'تم حذف حسابك بنجاح.'
          : 'Votre compte a été supprimé avec succès.'
      );
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err, lang));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">{t.onboardingTitle}</h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">{t.onboardingSubtitle}</p>
        </div>
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Firebase Auth Bar */}
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {firebaseUser ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-slate-600">{t.signedInAs} </span>
                <span className="font-semibold text-slate-900">
                  {firebaseUser.email || firebaseUser.uid}
                </span>
                <span className="mx-2 text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="text-emerald-700 font-medium">{t.firestoreSyncBadge}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600">{t.localPreviewNotice}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {firebaseUser ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void handleSignOutClick();
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.signOutBtn}</span>
                </button>
                {onDeleteAccount && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAccount((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'حذف الحساب' : 'Supprimer compte'}</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-emerald-700" />
                  <span>{t.googleSignInBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailAuth((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'البريد الإلكتروني' : 'E-mail'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Two-step Self-Service Account Deletion Confirmation */}
        {firebaseUser && confirmDeleteAccount && onDeleteAccount && (
          <div className="pt-3 border-t border-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-rose-900 bg-rose-50/70 p-3 rounded-lg">
            <p className="leading-snug">
              {lang === 'ar'
                ? 'هل أنت متأكد من حذف حسابك نهائياً؟ سيتم تعطيل ملفك كمعلم وحذف حساب المصادقة.'
                : 'Confirmer la suppression définitive de votre compte ? Votre profil Maâlem sera désactivé et votre accès supprimé.'}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDeleteAccount(false)}
                className="px-3 py-1.5 font-medium bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  void handleConfirmAccountDelete();
                }}
                className="px-3 py-1.5 font-semibold bg-rose-700 text-white rounded-md hover:bg-rose-800 disabled:opacity-60 cursor-pointer"
              >
                {isDeletingAccount
                  ? lang === 'ar'
                    ? 'جاري الحذف...'
                    : 'Suppression...'
                  : lang === 'ar'
                  ? 'تأكيد الحذف'
                  : 'Confirmer suppression'}
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Email/Password Sign-In, Sign-Up & Password Reset Panel */}
        {!firebaseUser && showEmailAuth && (
          <form
            onSubmit={handleEmailAuthSubmit}
            noValidate
            className="pt-3 border-t border-slate-200 space-y-3 text-xs"
          >
            <div className="flex flex-wrap items-center gap-2">
              {(['signin', 'signup', 'reset'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setEmailAuthMode(mode);
                    setAuthError(null);
                    setAuthInfoNotice(null);
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                    emailAuthMode === mode
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mode === 'signin'
                    ? lang === 'ar'
                      ? 'تسجيل الدخول'
                      : 'Connexion'
                    : mode === 'signup'
                    ? lang === 'ar'
                      ? 'إنشاء حساب'
                      : 'Créer un compte'
                    : lang === 'ar'
                    ? 'نسيت كلمة المرور'
                    : 'Mot de passe oublié'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                dir="ltr"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="nom@exemple.ma"
                aria-label="Email"
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {emailAuthMode !== 'reset' && (
                <input
                  type="password"
                  dir="ltr"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder={lang === 'ar' ? 'كلمة المرور (8+ أحرف)' : 'Mot de passe (8+ caractères)'}
                  aria-label="Password"
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isEmailSubmitting}
                className="px-4 py-2 font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
              >
                {isEmailSubmitting
                  ? lang === 'ar'
                    ? 'جاري المعالجة...'
                    : 'Traitement...'
                  : emailAuthMode === 'signin'
                  ? lang === 'ar'
                    ? 'دخول بالبريد'
                    : 'Se connecter'
                  : emailAuthMode === 'signup'
                  ? lang === 'ar'
                    ? 'إنشاء الحساب'
                    : 'S’inscrire'
                  : lang === 'ar'
                  ? 'إرسال رابط الاستعادة'
                  : 'Envoyer lien de réinitialisation'}
              </button>
            </div>
          </form>
        )}
      </div>

      {authInfoNotice && (
        <div
          role="status"
          className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs font-medium text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{authInfoNotice}</span>
        </div>
      )}

      {isUnverifiedAccount && (
        <div
          role="alert"
          className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-2.5 text-xs text-amber-950"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {lang === 'ar'
                ? 'بريدك الإلكتروني غير مؤكد بعد. يرجى تأكيد بريدك الإلكتروني لتفعيل حفظ الملف الشخصي والحجوزات والمحادثة.'
                : 'Votre adresse e-mail n’est pas encore vérifiée. Confirmez-la pour activer l’enregistrement du profil, les réservations et le chat.'}
            </p>
          </div>
          {verificationNotice && (
            <p className="text-emerald-800 font-medium">{verificationNotice}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isCheckingVerification}
              onClick={async () => {
                setAuthError(null);
                setVerificationNotice(null);
                setIsCheckingVerification(true);
                try {
                  await resendVerificationEmail();
                  setVerificationNotice(
                    lang === 'ar'
                      ? 'تم إرسال رابط التحقق إلى بريدك الإلكتروني.'
                      : 'Un lien de vérification vient d’être envoyé à votre adresse e-mail.'
                  );
                } catch (err) {
                  setAuthError(mapFirebaseAuthError(err, lang));
                } finally {
                  setIsCheckingVerification(false);
                }
              }}
              className="px-3 py-1.5 font-semibold bg-amber-700 text-white rounded-md hover:bg-amber-800 disabled:opacity-60 cursor-pointer"
            >
              {lang === 'ar' ? 'إعادة إرسال رابط التحقق' : 'Renvoyer l’e-mail de vérification'}
            </button>
            <button
              type="button"
              disabled={isCheckingVerification}
              onClick={async () => {
                setAuthError(null);
                setVerificationNotice(null);
                setIsCheckingVerification(true);
                try {
                  const refreshed = await reloadCurrentUser();
                  if (refreshed && isVerifiedAuthUser(refreshed)) {
                    setVerificationNotice(
                      lang === 'ar'
                        ? 'تم التحقق من بريدك الإلكتروني بنجاح!'
                        : 'Adresse e-mail vérifiée avec succès !'
                    );
                  } else {
                    setVerificationNotice(
                      lang === 'ar'
                        ? 'لم يتم تأكيد البريد بعد. تحقق من صندوق الوارد ثم أعد المحاولة.'
                        : 'E-mail pas encore confirmé. Vérifiez votre boîte de réception puis réessayez.'
                    );
                  }
                } catch (err) {
                  setAuthError(mapFirebaseAuthError(err, lang));
                } finally {
                  setIsCheckingVerification(false);
                }
              }}
              className="px-3 py-1.5 font-semibold bg-white text-amber-900 border border-amber-300 rounded-md hover:bg-amber-100 disabled:opacity-60 cursor-pointer"
            >
              {lang === 'ar' ? 'تحققت من بريدي' : 'J’ai vérifié mon e-mail'}
            </button>
          </div>
        </div>
      )}

      {authError && (
        <div
          role="alert"
          className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900"
        >
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
        {/* Dual-Role Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            {lang === 'ar' ? 'نوع الحساب على المنصة' : 'Votre profil sur la plateforme'}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setRole('client')}
              aria-pressed={role === 'client'}
              className={`text-start p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                role === 'client'
                  ? 'border-emerald-600 bg-emerald-50/50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <UserCheck
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  role === 'client' ? 'text-emerald-700' : 'text-slate-400'
                }`}
              />
              <div>
                <div className="text-sm font-semibold">{t.roleClientLabel}</div>
                <div className="text-xs text-slate-600 mt-1">{t.roleClientDesc}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('provider')}
              aria-pressed={role === 'provider'}
              className={`text-start p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                role === 'provider'
                  ? 'border-amber-600 bg-amber-50/40 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <Wrench
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  role === 'provider' ? 'text-amber-700' : 'text-slate-400'
                }`}
              />
              <div>
                <div className="text-sm font-semibold">{t.roleProviderLabel}</div>
                <div className="text-xs text-slate-600 mt-1">{t.roleProviderDesc}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('both')}
              aria-pressed={role === 'both'}
              className={`text-start p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                role === 'both'
                  ? 'border-blue-600 bg-blue-50/40 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <ShieldCheck
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  role === 'both' ? 'text-blue-700' : 'text-slate-400'
                }`}
              />
              <div>
                <div className="text-sm font-semibold">
                  {lang === 'ar'
                    ? 'زبون ومعلم (حساب مزدوج)'
                    : 'Client & Maâlem (Double Rôle)'}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {lang === 'ar'
                    ? 'حجز خدمات منزلية وتقديم خدماتك الحرفية في نفس الحساب'
                    : 'Réservez des interventions et proposez vos services Maâlem'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Core Firestore users/{uid} fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="onboarding-fullname"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t.fullNameLabel} <span className="text-rose-600">*</span>
            </label>
            <input
              id="onboarding-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.fullNamePlaceholder}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.fullName}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="onboarding-phone"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t.phoneLabel} <span className="text-rose-600">*</span>
            </label>
            <input
              id="onboarding-phone"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+212661234567"
              className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <p className="mt-1 text-xs text-slate-500">{t.phoneHint}</p>
            {errors.phone && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.phone}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="onboarding-city"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t.cityLabel} <span className="text-rose-600">*</span>
            </label>
            <select
              id="onboarding-city"
              value={city}
              onChange={(e) => setCity(e.target.value as MoroccanCity)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {MOROCCAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {t.cities[c]}
                </option>
              ))}
            </select>
            {errors.city && <p className="mt-1 text-xs text-rose-600">{errors.city}</p>}
          </div>

          <div>
            <label
              htmlFor="onboarding-neighborhood"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t.neighborhoodLabel} <span className="text-rose-600">*</span>
            </label>
            <input
              id="onboarding-neighborhood"
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder={t.neighborhoodPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {errors.neighborhood && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.neighborhood}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="onboarding-langpref"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t.languagePrefLabel}
            </label>
            <select
              id="onboarding-langpref"
              value={languagePref}
              onChange={(e) => setLanguagePref(e.target.value as LanguageCode)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="fr">Français (LTR)</option>
              <option value="ar">العربية (RTL)</option>
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.verifiedStatusLabel}
            </span>
            <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-700">
              <ShieldCheck
                className={`w-4 h-4 shrink-0 ${
                  currentProfile?.verifiedBadge ? 'text-emerald-600' : 'text-amber-600'
                }`}
              />
              <span>
                {currentProfile?.verifiedBadge ? t.verifiedActiveText : t.verifiedPendingText}
              </span>
            </div>
          </div>
        </div>

        {/* Provider-Specific Fields */}
        {(role === 'provider' || role === 'both') && (
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="onboarding-specialty"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t.specialtyLabel}
              </label>
              <select
                id="onboarding-specialty"
                value={specialty === 'none' ? 'Plomberie' : specialty}
                onChange={(e) => setSpecialty(e.target.value as ServiceCategory)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t.categories[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="onboarding-rate"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t.hourlyRateInputLabel}
              </label>
              <input
                id="onboarding-rate"
                type="number"
                min={50}
                max={50000}
                step={10}
                value={hourlyRateMad}
                onChange={(e) => setHourlyRateMad(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {errors.hourlyRateMad && (
                <p className="mt-1 text-xs text-rose-600">{errors.hourlyRateMad}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="onboarding-bio"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t.bioLabel}
              </label>
              <textarea
                id="onboarding-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t.bioPlaceholder}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {errors.bio && <p className="mt-1 text-xs text-rose-600">{errors.bio}</p>}
            </div>
          </div>
        )}

        {saveSuccess && (
          <div
            role="status"
            className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs font-medium text-emerald-900"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t.profileSavedSuccess}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {t.closeBtn}
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            {isSaving ? t.savingProfileBtn : t.saveProfileBtn}
          </button>
        </div>
      </form>
    </div>
  );
};
