import {
  MOROCCAN_CITIES,
  SERVICE_CATEGORIES,
  calculateEscrowSplit,
  type BookingRecord,
  type MoroccanCity,
  type ServiceCategory,
  type UserProfileRecord,
  type VettedProvider,
} from './marketplace';

export {
  DEFAULT_ADMIN_EMAIL_PLACEHOLDER,
  DEFAULT_SYSTEM_SETTINGS,
  type SystemSettingsRecord,
} from './systemSettings';

export type AdminActionType =
  | 'cin_approved'
  | 'cin_revoked'
  | 'document_viewed'
  | 'kyc_reviewed'
  | 'dispute_resolved'
  | 'report_moderated'
  | 'user_suspended'
  | 'escrow_released'
  | 'escrow_refunded'
  | 'dispute_split'
  | 'booking_override'
  | 'review_deleted'
  | 'availability_toggled'
  | 'withdrawal_updated'
  | 'settings_updated';

export type AdminTargetCollection =
  | 'users'
  | 'providers'
  | 'providerDocuments'
  | 'bookings'
  | 'disputes'
  | 'reviews'
  | 'reviewReports'
  | 'chatReports'
  | 'withdrawals'
  | 'settings';

export interface AdminModerationReportItem {
  id: string;
  source: 'reviewReports' | 'chatReports';
  targetId: string;
  reporterId: string;
  reason: string;
  details: string;
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed';
  createdAtIso: string;
}

export interface AdminAuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  actionType: AdminActionType;
  targetCollection: AdminTargetCollection;
  targetId: string;
  summary: string;
  createdAtIso: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'completed' | 'frozen' | 'rejected';

export interface WithdrawalRecord {
  id: string;
  providerId: string;
  providerName: string;
  city: MoroccanCity;
  bankName: string;
  ribMasked: string;
  amountMad: number;
  status: WithdrawalStatus;
  adminNote?: string;
  createdAtIso: string;
}

export interface AdminReviewItem {
  id: string;
  providerId: string;
  providerNameFr: string;
  providerNameAr: string;
  category: ServiceCategory;
  city: MoroccanCity;
  authorName: string;
  quartier: string;
  rating: number;
  date: string;
  commentFr: string;
  commentAr: string;
  isLiveFirestore?: boolean;
}

export interface CategoryBreakdown {
  category: ServiceCategory;
  bookingsCount: number;
  revenueMad: number;
  providersCount: number;
  sharePct: number;
}

export interface CityBreakdown {
  city: MoroccanCity;
  providersCount: number;
  bookingsCount: number;
  revenueMad: number;
}

export interface AdminAnalyticsSummary {
  totalGmvMad: number;
  escrowHeldMad: number;
  escrowHeldCount: number;
  settledRevenueMad: number;
  platformFeesMad: number;
  providerPayoutsMad: number;
  refundedTotalMad: number;
  totalBookingsCount: number;
  pendingBookingsCount: number;
  activeBookingsCount: number;
  completedBookingsCount: number;
  cancelledBookingsCount: number;
  completionRatePct: number;
  totalProvidersCount: number;
  verifiedProvidersCount: number;
  pendingCinCount: number;
  availableNowCount: number;
  averageRating: number;
  totalUsersCount: number;
  clientsCount: number;
  providersRoleCount: number;
  bothRoleCount: number;
  categoryBreakdown: CategoryBreakdown[];
  cityBreakdown: CityBreakdown[];
}

export function computeAdminAnalytics(
  providers: VettedProvider[],
  bookings: BookingRecord[],
  users: UserProfileRecord[],
  platformFeePct = 10
): AdminAnalyticsSummary {
  const nonCancelled = bookings.filter((b) => b.status !== 'cancelled');
  const totalGmvMad = nonCancelled.reduce((sum, b) => sum + b.estimatedMad, 0);

  const escrowHeldBookings = nonCancelled.filter(
    (b) => b.paymentMethod === 'cmi_escrow' && b.paymentStatus === 'escrow_held'
  );
  const escrowHeldMad = escrowHeldBookings.reduce((sum, b) => sum + b.estimatedMad, 0);

  const settledBookings = nonCancelled.filter(
    (b) => b.paymentStatus === 'paid' || b.paymentStatus === 'disputed_split'
  );
  const settledRevenueMad = settledBookings.reduce((sum, b) => sum + b.estimatedMad, 0);

  const platformFeesMad = settledBookings.reduce((sum, b) => {
    if (typeof b.platformFeeMad === 'number') return sum + b.platformFeeMad;
    return sum + calculateEscrowSplit(b.estimatedMad, platformFeePct, 100).platformFeeMad;
  }, 0);

  const providerPayoutsMad = settledBookings.reduce((sum, b) => {
    if (typeof b.providerPayoutMad === 'number') return sum + b.providerPayoutMad;
    return sum + calculateEscrowSplit(b.estimatedMad, platformFeePct, 100).providerPayoutMad;
  }, 0);

  const refundedTotalMad = bookings.reduce((sum, b) => {
    if (typeof b.refundedClientMad === 'number') return sum + b.refundedClientMad;
    if (b.paymentStatus === 'refunded') return sum + b.estimatedMad;
    return sum;
  }, 0);

  const pendingBookingsCount = bookings.filter((b) => b.status === 'pending').length;
  const activeBookingsCount = bookings.filter(
    (b) => b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress'
  ).length;
  const completedBookingsCount = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'reviewed'
  ).length;
  const cancelledBookingsCount = bookings.filter((b) => b.status === 'cancelled').length;

  const completionRatePct =
    nonCancelled.length > 0
      ? Math.round((completedBookingsCount / nonCancelled.length) * 100)
      : 0;

  const verifiedProvidersCount = providers.filter((p) => p.verifiedBadge).length;
  const pendingCinCount = providers.filter((p) => !p.verifiedBadge).length;
  const availableNowCount = providers.filter((p) => p.isAvailableNow).length;

  const ratedProviders = providers.filter((p) => p.reviewCount > 0);
  const averageRating =
    ratedProviders.length > 0
      ? Number(
          (
            ratedProviders.reduce((sum, p) => sum + p.ratingAvg, 0) / ratedProviders.length
          ).toFixed(2)
        )
      : 0;

  const clientsCount = users.filter((u) => u.role === 'client').length;
  const providersRoleCount = users.filter((u) => u.role === 'provider').length;
  const bothRoleCount = users.filter((u) => u.role === 'both').length;

  const categoryBreakdown: CategoryBreakdown[] = SERVICE_CATEGORIES.map((category) => {
    const catBookings = nonCancelled.filter((b) => b.category === category);
    const revenueMad = catBookings.reduce((sum, b) => sum + b.estimatedMad, 0);
    const providersCount = providers.filter((p) => p.category === category).length;
    const sharePct = totalGmvMad > 0 ? Math.round((revenueMad / totalGmvMad) * 100) : 0;
    return {
      category,
      bookingsCount: catBookings.length,
      revenueMad,
      providersCount,
      sharePct,
    };
  }).sort((a, b) => b.revenueMad - a.revenueMad || b.providersCount - a.providersCount);

  const cityBreakdown: CityBreakdown[] = MOROCCAN_CITIES.map((city) => {
    const cityBookings = nonCancelled.filter((b) => b.city === city);
    const revenueMad = cityBookings.reduce((sum, b) => sum + b.estimatedMad, 0);
    const providersCount = providers.filter((p) => p.location.city === city).length;
    return {
      city,
      providersCount,
      bookingsCount: cityBookings.length,
      revenueMad,
    };
  }).sort((a, b) => b.providersCount - a.providersCount || b.revenueMad - a.revenueMad);

  return {
    totalGmvMad,
    escrowHeldMad,
    escrowHeldCount: escrowHeldBookings.length,
    settledRevenueMad,
    platformFeesMad,
    providerPayoutsMad,
    refundedTotalMad,
    totalBookingsCount: bookings.length,
    pendingBookingsCount,
    activeBookingsCount,
    completedBookingsCount,
    cancelledBookingsCount,
    completionRatePct,
    totalProvidersCount: providers.length,
    verifiedProvidersCount,
    pendingCinCount,
    availableNowCount,
    averageRating,
    totalUsersCount: users.length,
    clientsCount,
    providersRoleCount,
    bothRoleCount,
    categoryBreakdown,
    cityBreakdown,
  };
}

export function flattenProviderReviews(providers: VettedProvider[]): AdminReviewItem[] {
  const items: AdminReviewItem[] = [];
  for (const p of providers) {
    for (const r of p.reviews) {
      items.push({
        id: r.id,
        providerId: p.id,
        providerNameFr: p.fullNameFr,
        providerNameAr: p.fullNameAr,
        category: p.category,
        city: p.location.city,
        authorName: r.authorName,
        quartier: r.quartier,
        rating: r.rating,
        date: r.date,
        commentFr: r.commentFr,
        commentAr: r.commentAr,
      });
    }
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Recalculates a provider's average rating and review count after an admin removes a review.
 */
export function recalculateRatingAfterReviewRemoval(
  currentAvg: number,
  currentCount: number,
  removedRating: number
): { ratingAvg: number; reviewCount: number } {
  const safeCount = Math.max(0, Math.round(currentCount));
  if (safeCount <= 1) {
    return { ratingAvg: 5.0, reviewCount: 0 };
  }
  const nextCount = safeCount - 1;
  const remainingPoints = currentAvg * safeCount - removedRating;
  const clampedAvg = Math.max(1, Math.min(5, remainingPoints / nextCount));
  return {
    ratingAvg: Math.round(clampedAvg * 10) / 10,
    reviewCount: nextCount,
  };
}

const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | undefined): string {
  let str = String(value ?? '');
  if (CSV_FORMULA_PREFIX.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateBookingsCsv(bookings: BookingRecord[]): string {
  const headers = [
    'Ref',
    'Date',
    'TimeSlot',
    'Client',
    'ClientPhone',
    'Provider',
    'Category',
    'City',
    'Neighborhood',
    'AmountMAD',
    'PaymentMethod',
    'PaymentStatus',
    'Status',
  ];
  const rows = bookings.map((b) =>
    [
      b.bookingRef,
      b.preferredDate,
      b.preferredTimeSlot,
      b.clientName,
      b.clientPhone,
      b.providerName,
      b.category,
      b.city,
      b.neighborhood,
      b.estimatedMad,
      b.paymentMethod,
      b.paymentStatus,
      b.status,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
