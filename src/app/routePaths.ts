import type { ServiceCategory } from '../utils/marketplace';
import type { ProviderTab } from '../components/dashboards/ProviderDashboard';

/**
 * Single source of truth for all internal React Router paths in Moul L'Khedma.
 * Never hardcode route strings across components — import from ROUTE_PATHS.
 */
export const ROUTE_PATHS = {
  // Public routes
  HOME: '/',
  SERVICES: '/services',
  SERVICE_CATEGORY: '/services/:category',
  PROVIDER_DETAIL: '/providers/:id',
  TERMS: '/terms',
  PRIVACY: '/privacy',

  // Auth routes
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',

  // Error & Access routes
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '/404',

  // Customer routes (preserving existing /dashboard and /profile URLs)
  CUSTOMER_DASHBOARD: '/dashboard',
  CUSTOMER_ALT_DASHBOARD: '/customer/dashboard',
  CUSTOMER_REQUESTS: '/customer/requests',
  CUSTOMER_PROFILE: '/profile',
  CUSTOMER_ALT_PROFILE: '/customer/profile',

  // Shared authenticated communication, alerts & disputes routes
  MESSAGES: '/messages',
  MESSAGES_THREAD: '/messages/:bookingId',
  NOTIFICATIONS: '/notifications',
  DISPUTES: '/disputes',

  // Provider routes
  PROVIDER_ROOT: '/provider',
  PROVIDER_DASHBOARD: '/provider/dashboard',
  PROVIDER_JOBS: '/provider/jobs',
  PROVIDER_MISSIONS: '/provider/missions',
  PROVIDER_CARD: '/provider/card',
  PROVIDER_SERVICES: '/provider/services',
  PROVIDER_CALENDAR: '/provider/calendar',
  PROVIDER_VERIFICATION: '/provider/verification',
  PROVIDER_EARNINGS: '/provider/earnings',

  // Admin routes
  ADMIN_ROOT: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_WILDCARD: '/admin/*',
} as const;

export const CATEGORY_TO_SLUG: Record<ServiceCategory, string> = {
  Plomberie: 'plumbing',
  Électricité: 'electricity',
  Peinture: 'painting',
  'Soutien Scolaire': 'tutoring',
  Ménage: 'cleaning',
  Climatisation: 'hvac',
  Menuiserie: 'carpentry',
  Serrurerie: 'locksmith',
  Électroménager: 'appliance-repair',
  Jardinage: 'gardening',
  Déménagement: 'moving',
  Maçonnerie: 'masonry',
};

const SLUG_ALIASES_TO_CATEGORY: Record<string, ServiceCategory> = {
  // Canonical English slugs
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  electrical: 'Électricité',
  painting: 'Peinture',
  tutoring: 'Soutien Scolaire',
  cleaning: 'Ménage',
  hvac: 'Climatisation',
  ac: 'Climatisation',
  carpentry: 'Menuiserie',
  locksmith: 'Serrurerie',
  'appliance-repair': 'Électroménager',
  appliances: 'Électroménager',
  gardening: 'Jardinage',
  moving: 'Déménagement',
  masonry: 'Maçonnerie',
  // French slugs (accent-stripped & hyphenated)
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  peinture: 'Peinture',
  'soutien-scolaire': 'Soutien Scolaire',
  soutien: 'Soutien Scolaire',
  menage: 'Ménage',
  climatisation: 'Climatisation',
  menuiserie: 'Menuiserie',
  serrurerie: 'Serrurerie',
  electromenager: 'Électroménager',
  jardinage: 'Jardinage',
  demenagement: 'Déménagement',
  maconnerie: 'Maçonnerie',
};

function normalizeSlug(raw: string): string {
  return decodeURIComponent(raw)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
}

export function getSlugForCategory(category: ServiceCategory): string {
  return CATEGORY_TO_SLUG[category];
}

export function resolveCategoryFromSlug(slug: string | undefined): ServiceCategory | null {
  if (!slug) return null;
  const normalized = normalizeSlug(slug);
  return SLUG_ALIASES_TO_CATEGORY[normalized] ?? null;
}

export function buildServiceCategoryPath(category: ServiceCategory): string {
  return `/services/${getSlugForCategory(category)}`;
}

export function buildProviderDetailPath(providerId: string): string {
  return `/providers/${encodeURIComponent(providerId)}`;
}

export function buildMessageThreadPath(bookingId: string): string {
  return `/messages/${encodeURIComponent(bookingId)}`;
}

export function getProviderTabFromPathname(pathname: string): ProviderTab {
  if (pathname.startsWith(ROUTE_PATHS.PROVIDER_MISSIONS)) return 'missions';
  if (pathname.startsWith(ROUTE_PATHS.PROVIDER_CARD)) return 'card';
  if (pathname.startsWith(ROUTE_PATHS.PROVIDER_SERVICES)) return 'services';
  if (pathname.startsWith(ROUTE_PATHS.PROVIDER_CALENDAR)) return 'calendar';
  if (pathname.startsWith(ROUTE_PATHS.PROVIDER_VERIFICATION)) return 'verification';
  if (pathname.startsWith(ROUTE_PATHS.PROVIDER_EARNINGS)) return 'earnings';
  return 'jobs';
}

export function getPathForProviderTab(tab: ProviderTab): string {
  switch (tab) {
    case 'missions':
      return ROUTE_PATHS.PROVIDER_MISSIONS;
    case 'card':
      return ROUTE_PATHS.PROVIDER_CARD;
    case 'services':
      return ROUTE_PATHS.PROVIDER_SERVICES;
    case 'calendar':
      return ROUTE_PATHS.PROVIDER_CALENDAR;
    case 'verification':
      return ROUTE_PATHS.PROVIDER_VERIFICATION;
    case 'earnings':
      return ROUTE_PATHS.PROVIDER_EARNINGS;
    case 'jobs':
    default:
      return ROUTE_PATHS.PROVIDER_DASHBOARD;
  }
}

export function buildLoginRedirectPath(fromPath: string): string {
  const safeRedirect = fromPath.startsWith('/') && !fromPath.startsWith('//') ? fromPath : '/';
  return `${ROUTE_PATHS.LOGIN}?redirect=${encodeURIComponent(safeRedirect)}`;
}

export function sanitizeRedirectPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (trimmed === ROUTE_PATHS.LOGIN || trimmed === ROUTE_PATHS.REGISTER) return fallback;
  return trimmed;
}
