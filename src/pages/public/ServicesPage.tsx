import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useMarketplace } from '../../app/providers/MarketplaceContext';
import { ROUTE_PATHS, resolveCategoryFromSlug } from '../../app/routePaths';
import { ProviderDiscoverySection } from '../../components/ProviderDiscoverySection';
import { NotFoundPage } from './NotFoundPage';

export const ServicesPage: React.FC = () => {
  const { t, isAr } = useMarketplace();
  const { category: categorySlug } = useParams<{ category?: string }>();

  const resolvedCategory = categorySlug ? resolveCategoryFromSlug(categorySlug) : 'ALL';

  // Unknown /services/:invalid-slug renders clean 404 instead of silently ignoring the URL
  if (categorySlug && !resolvedCategory) {
    return <NotFoundPage />;
  }

  const ChevronIcon = isAr ? ChevronLeft : ChevronRight;
  const pageTitle =
    resolvedCategory && resolvedCategory !== 'ALL'
      ? t.categories[resolvedCategory]
      : t.servicesCatalogTitle;

  return (
    <div>
      <div className="bg-white border-b border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500"
          >
            <Link to={ROUTE_PATHS.HOME} className="hover:text-emerald-700 hover:underline">
              {t.brandName}
            </Link>
            <ChevronIcon className="w-3.5 h-3.5" />
            {resolvedCategory && resolvedCategory !== 'ALL' ? (
              <>
                <Link
                  to={ROUTE_PATHS.SERVICES}
                  className="hover:text-emerald-700 hover:underline"
                >
                  {t.allServicesTab}
                </Link>
                <ChevronIcon className="w-3.5 h-3.5" />
                <span className="text-slate-900 font-semibold">
                  {t.categories[resolvedCategory]}
                </span>
              </>
            ) : (
              <span className="text-slate-900 font-semibold">{t.allServicesTab}</span>
            )}
          </nav>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">{t.servicesCatalogSubtitle}</p>
        </div>
      </div>

      <ProviderDiscoverySection routeCategory={resolvedCategory ?? 'ALL'} syncUrl={true} />
    </div>
  );
};
