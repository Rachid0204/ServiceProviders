import { uiText } from '../i18n/uiCopy';
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { MOROCCAN_CITIES, SERVICE_CATEGORIES } from '../utils/marketplace';
import { getTradeShortLabel } from '../utils/tradeMeta';
import { useMarketplace } from '../app/providers/MarketplaceContext';
import { ROUTE_PATHS, buildServiceCategoryPath } from '../app/routePaths';

export const Footer: React.FC = () => {
  const { lang, t, isAr, firebaseUser, isPureProvider, hasAdminAccess, supportWhatsAppUrl } =
    useMarketplace();

  return (
    <footer className="bg-white border-t border-slate-200 pt-10 pb-24 md:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {!isPureProvider ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 text-xs">
            <div className="lg:col-span-3 space-y-2.5">
              <div className="text-base font-bold text-slate-900">
                {t.brandName}{' '}
                <span className="text-emerald-700 font-semibold">({t.brandArabic})</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{t.footerTagline}</p>
            </div>

            <div className="lg:col-span-4 space-y-2.5">
              <div className="font-bold text-slate-900">
                {uiText(isAr).publicUi.metiersServices}
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-600">
                {SERVICE_CATEGORIES.map((cat) => (
                  <li key={cat}>
                    <Link
                      to={buildServiceCategoryPath(cat)}
                      className="hover:text-emerald-700 hover:underline inline-block py-0.5"
                    >
                      {getTradeShortLabel(cat, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2 space-y-2.5">
              <div className="font-bold text-slate-900">
                {uiText(isAr).publicUi.villesDesservies}
              </div>
              <ul className="space-y-1.5 text-slate-600">
                {MOROCCAN_CITIES.map((city) => (
                  <li key={city}>
                    <Link
                      to={`${ROUTE_PATHS.SERVICES}?city=${encodeURIComponent(city)}`}
                      className="hover:text-emerald-700 hover:underline inline-block py-0.5"
                    >
                      {t.cities[city]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3 space-y-2.5">
              <div className="font-bold text-slate-900">
                {uiText(isAr).publicUi.espacesSupport}
              </div>
              <ul className="space-y-1.5 text-slate-600">
                <li>
                  <Link
                    to={firebaseUser ? ROUTE_PATHS.CUSTOMER_DASHBOARD : ROUTE_PATHS.LOGIN}
                    className="hover:text-emerald-700 hover:underline"
                  >
                    {uiText(isAr).publicUi.espaceClient}
                  </Link>
                </li>
                <li>
                  <Link
                    to={
                      firebaseUser
                        ? ROUTE_PATHS.PROVIDER_DASHBOARD
                        : `${ROUTE_PATHS.REGISTER}?role=provider`
                    }
                    className="hover:text-emerald-700 hover:underline"
                  >
                    {t.providerDashboardTab}
                  </Link>
                </li>
                {supportWhatsAppUrl && (
                  <li>
                    <a
                      href={supportWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-700 hover:underline"
                    >
                      {uiText(isAr).publicUi.supportWhatsapp}
                    </a>
                  </li>
                )}
                {hasAdminAccess && (
                  <li>
                    <Link
                      to={ROUTE_PATHS.ADMIN_DASHBOARD}
                      className="text-emerald-700 font-semibold hover:underline"
                    >
                      {t.navAdmin}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
            <div>
              <span className="font-bold text-slate-900">{t.brandName}</span> —{' '}
              {uiText(isAr).publicUi.espaceProMaalemsMaroc}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={ROUTE_PATHS.CUSTOMER_PROFILE}
                className="hover:text-emerald-700 hover:underline"
              >
                {uiText(isAr).publicUi.activerUnCompteDoubleClientMaalem}
              </Link>
              {supportWhatsAppUrl && (
                <a
                  href={supportWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-700 hover:underline"
                >
                  {uiText(isAr).publicUi.supportMaalemsWhatsapp}
                </a>
              )}
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <span>{t.footerRights}</span>
            <Link to={ROUTE_PATHS.TERMS} className="hover:text-emerald-700 hover:underline">
              {uiText(isAr).common.cgu}
            </Link>
            <Link to={ROUTE_PATHS.PRIVACY} className="hover:text-emerald-700 hover:underline">
              {uiText(isAr).common.confidentialiteLoi0908}
            </Link>
          </div>
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {uiText(isAr).publicUi.plateformeMarocaineVerifieeIdentiteControleeTarifs}
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
};
