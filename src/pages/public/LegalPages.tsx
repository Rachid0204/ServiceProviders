import { uiText } from '../../i18n/uiCopy';
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS } from '../../app/routePaths';

export const TermsPage: React.FC = () => {
  const { t, isAr } = useMarketplace();
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link
        to={ROUTE_PATHS.HOME}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
      >
        <BackIcon className="w-4 h-4" />
        <span>{t.backHomeBtn}</span>
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-emerald-700 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.termsPageTitle}</h1>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {uiText(isAr).publicUi.n1RoleDeLaPlateformeMoul}
            </h2>
            <p>
              {uiText(isAr).publicUi.moulLKhedmaMetEnRelation}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {uiText(isAr).publicUi.n2VerificationDIdentiteEtAvis}
            </h2>
            <p>
              {uiText(isAr).publicUi.leBadgeDeVerificationCinEst}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {uiText(isAr).publicUi.n3AnnulationsEtReglementDesLitiges}
            </h2>
            <p>
              {uiText(isAr).publicUi.lesDemandesPeuventEtreAnnuleesOu}
            </p>
          </section>
        </div>
      </div>
    </article>
  );
};

export const PrivacyPage: React.FC = () => {
  const { t, isAr } = useMarketplace();
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link
        to={ROUTE_PATHS.HOME}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
      >
        <BackIcon className="w-4 h-4" />
        <span>{t.backHomeBtn}</span>
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.privacyPageTitle}</h1>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {uiText(isAr).publicUi.n1ConformiteALaLoiMarocaine}
            </h2>
            <p>
              {uiText(isAr).publicUi.moulLKhedmaTraiteVosDonnees}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {uiText(isAr).publicUi.n2ConfidentialiteDesJustificatifsCin}
            </h2>
            <p>
              {uiText(isAr).publicUi.lesCopiesDeCinEtDiplomes}
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-bold text-slate-900">
              {uiText(isAr).publicUi.n3DroitsDAccesDeRectification}
            </h2>
            <p>
              {uiText(isAr).publicUi.vousDisposezAToutMomentD}
            </p>
          </section>
        </div>
      </div>
    </article>
  );
};
