import React from 'react';
import { LogIn, Sparkles, Wrench } from 'lucide-react';
import { uiText } from '../../i18n/uiCopy';

export const ProviderUnauthenticatedGate: React.FC<{
  isAr: boolean;
  onOpenAuth: () => void;
}> = ({ isAr, onOpenAuth }) => (
  <div className="max-w-2xl mx-auto px-4 py-16">
    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-5 shadow-2xs">
      <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
        <Wrench className="w-6 h-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold text-slate-900">
          {uiText(isAr).provider.espaceMaalemPrestataires}
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          {uiText(isAr).provider.connectezVousPourConsulterLesOffres}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenAuth}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
      >
        <LogIn className="w-4 h-4" />
        <span>{uiText(isAr).provider.connexionDevenirMaalem}</span>
      </button>
    </div>
  </div>
);

export const ProviderUpgradeClientGate: React.FC<{
  isAr: boolean;
  onActivateProvider: () => void;
}> = ({ isAr, onActivateProvider }) => (
  <div className="max-w-2xl mx-auto px-4 py-16">
    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-5 shadow-2xs">
      <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
        <Sparkles className="w-6 h-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-slate-900">
          {uiText(isAr).provider.activezVotreEspaceMaalem}
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {uiText(isAr).provider.votreCompteEstActuellementConfigureEn}
        </p>
      </div>
      <button
        type="button"
        onClick={onActivateProvider}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
      >
        <Wrench className="w-4 h-4" />
        <span>{uiText(isAr).provider.creerMaFicheMaalemMaintenant}</span>
      </button>
    </div>
  </div>
);
