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
  ADMIN_KYC: '/admin/kyc',
  ADMIN_PROVIDERS: '/admin/providers',
  ADMIN_BOOKINGS: '/admin/bookings',
  ADMIN_DISPUTES: '/admin/disputes',
  ADMIN_WITHDRAWALS: '/admin/withdrawals',
  ADMIN_USERS: '/admin/users',
  ADMIN_REVIEWS: '/admin/reviews',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_AUDIT: '/admin/audit',
  ADMIN_WILDCARD: '/admin/*',
} as const;

export type AdminRouteSectionId =
  | 'overview'
  | 'kyc'
  | 'providers'
  | 'bookings'
  | 'disputes'
  | 'withdrawals'
  | 'users'
  | 'reviews'
  | 'settings'
  | 'audit';

export function getAdminSectionFromPathname(pathname: string): AdminRouteSectionId {
  if (pathname.startsWith(ROUTE_PATHS.ADMIN_KYC)) return 'kyc';
  if (pathname.startsWith(ROUTE_PATHS.ADMIN_PROVIDERS)) return 'providers';
  if (pathname.startsWith(ROUTE_PATHS.ADMIN_BOOKINGS)) return 'bookings';
  if (pathname.startsWith(ROUTE_PATHS.ADMIN_DISPUTES)) return 'disputes';
  if (pathname.startsWith(ROUTE_PATHS.ADMIN_WITHDRAWALS)) return 'withdrawals';
  if (pathname.startsWith(ROUTE_PATHS.ADMIN_USERS)) return 'users';
  if (pathname.startsWith(ROUTE_PATHS.ADMIN_REVIEWS)) return 'reviews';
  if (pathname.startsWith(ROUTE_PATHS.ADMIN_SETTINGS)) return 'settings';
  if (pathname.startsWith(ROUTE_PATHS.ADMIN_AUDIT)) return 'audit';
  return 'overview';
}

export function getPathForAdminSection(section: AdminRouteSectionId): string {
  switch (section) {
    case 'kyc':
      return ROUTE_PATHS.ADMIN_KYC;
    case 'providers':
      return ROUTE_PATHS.ADMIN_PROVIDERS;
    case 'bookings':
      return ROUTE_PATHS.ADMIN_BOOKINGS;
    case 'disputes':
      return ROUTE_PATHS.ADMIN_DISPUTES;
    case 'withdrawals':
      return ROUTE_PATHS.ADMIN_WITHDRAWALS;
    case 'users':
      return ROUTE_PATHS.ADMIN_USERS;
    case 'reviews':
      return ROUTE_PATHS.ADMIN_REVIEWS;
    case 'settings':
      return ROUTE_PATHS.ADMIN_SETTINGS;
    case 'audit':
      return ROUTE_PATHS.ADMIN_AUDIT;
    case 'overview':
    default:
      return ROUTE_PATHS.ADMIN_DASHBOARD;
  }
}

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
