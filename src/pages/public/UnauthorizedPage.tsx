import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS } from '../../app/routePaths';

export const UnauthorizedPage: React.FC = () => {
  const { t, firebaseUser, isPureProvider } = useMarketplace();
  const dashboardPath = isPureProvider
    ? ROUTE_PATHS.PROVIDER_DASHBOARD
    : ROUTE_PATHS.CUSTOMER_DASHBOARD;

  return (
    <section className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 mx-auto border border-rose-200">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <div className="space-y-2">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
          {t.unauthorizedBadge}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t.unauthorizedTitle}</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {t.unauthorizedDesc}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {firebaseUser && (
          <Link
            to={dashboardPath}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t.goToDashboardBtn}</span>
          </Link>
        )}
        {!isPureProvider && (
          <Link
            to={ROUTE_PATHS.HOME}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Home className="w-4 h-4 text-emerald-700" />
            <span>{t.backHomeBtn}</span>
          </Link>
        )}
      </div>
    </section>
  );
};
