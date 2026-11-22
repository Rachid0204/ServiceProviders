import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, SearchX } from 'lucide-react';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS } from '../../app/routePaths';

export const NotFoundPage: React.FC = () => {
  const { t, isPureProvider } = useMarketplace();

  return (
    <section className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 mx-auto">
        <SearchX className="w-7 h-7" />
      </div>
      <div className="space-y-2">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
          {t.notFoundBadge}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t.notFoundTitle}</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {t.notFoundDesc}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to={isPureProvider ? ROUTE_PATHS.PROVIDER_DASHBOARD : ROUTE_PATHS.HOME}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>{isPureProvider ? t.goToDashboardBtn : t.backHomeBtn}</span>
        </Link>
        {!isPureProvider && (
          <Link
            to={ROUTE_PATHS.SERVICES}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Compass className="w-4 h-4 text-emerald-700" />
            <span>{t.browseServicesBtn}</span>
          </Link>
        )}
      </div>
    </section>
  );
};
