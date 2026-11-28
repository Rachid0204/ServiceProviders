import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { uiText } from '../i18n/uiCopy';
import type { LanguageCode } from '../utils/marketplace';

interface SharedAuthFieldsProps {
  lang: LanguageCode;
  emailId: string;
  passwordId: string;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showPasswordField?: boolean;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  passwordAutoComplete?: 'current-password' | 'new-password';
  required?: boolean;
  inputVariant?: 'white' | 'subtle';
  onForgotPassword?: () => void;
}

export const SharedAuthFields: React.FC<SharedAuthFieldsProps> = ({
  lang,
  emailId,
  passwordId,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPasswordField = true,
  passwordLabel,
  passwordPlaceholder,
  passwordAutoComplete = 'current-password',
  required = false,
  inputVariant = 'white',
  onForgotPassword,
}) => {
  const isAr = lang === 'ar';
  const [showPassword, setShowPassword] = useState(false);

  const inputSurfaceClass =
    inputVariant === 'subtle'
      ? 'bg-slate-50 border-slate-200 focus:bg-white'
      : 'bg-white border-slate-300';

  return (
    <>
      <div>
        <label
          htmlFor={emailId}
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          {uiText(isAr).auth.adresseEMail}
        </label>
        <div className="relative" dir="ltr">
          <Mail className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <input
            id={emailId}
            type="email"
            required={required}
            dir="ltr"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="nom@exemple.ma"
            autoComplete="email"
            className={`w-full min-h-[44px] ps-10 pe-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 ${inputSurfaceClass}`}
          />
        </div>
      </div>

      {showPasswordField && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={passwordId}
              className="block text-xs font-semibold text-slate-700"
            >
              {passwordLabel ?? uiText(isAr).auth.motDePasse}
            </label>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-[11px] font-medium text-emerald-700 hover:underline cursor-pointer"
              >
                {uiText(isAr).auth.motDePasseOublie}
              </button>
            )}
          </div>
          <div className="relative" dir="ltr">
            <Lock className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
            <input
              id={passwordId}
              type={showPassword ? 'text' : 'password'}
              required={required}
              dir="ltr"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder={passwordPlaceholder}
              autoComplete={passwordAutoComplete}
              className={`w-full min-h-[44px] ps-10 pe-11 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 ${inputSurfaceClass}`}
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
      )}
    </>
  );
};
