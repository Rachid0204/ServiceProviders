import {
  TIME_SLOTS,
  getWeekdayKeyForIsoDate,
  type BookingRecord,
  type LanguageCode,
  type NotificationPreferencesRecord,
  type NotificationRecord,
  type ProviderAvailabilitySchedule,
  type ProviderServiceItem,
  type RevisedQuoteRecord,
  type TimeSlot,
  type VettedProvider,
} from './marketplace';
import type { AdminAuditLog } from './adminMetrics';

/**
 * Resolves whether the signed-in user is acting as 'provider' or 'client'
 * on a specific booking, independent of the current URL pathname.
 * Prevents double-account ('both') role mismatches when opening modals from Messages/Notifications.
 */
export function resolveBookingActorRole(
  booking: Pick<BookingRecord, 'clientId' | 'providerId'> | null | undefined,
  currentUid: string | null | undefined,
  fallbackIsProviderRoute = false
): 'client' | 'provider' {
  if (booking && currentUid) {
    if (booking.providerId === currentUid) return 'provider';
    if (booking.clientId === currentUid) return 'client';
  }
  return fallbackIsProviderRoute ? 'provider' : 'client';
}

export interface CatalogBookingEstimate {
  serviceTypeLabel: string;
  estimatedMad: number;
  pricingModel: 'fixed' | 'hourly' | 'quote_required' | 'default';
  estimatedHours: number;
}

/**
 * Computes an accurate initial MAD estimate and label from an optional structured
 * ProviderServiceItem selected from the Maâlem's public catalog.
 */
export function computeCatalogBookingEstimate(
  provider: Pick<VettedProvider, 'hourlyRateMAD' | 'fixedVisitFeeMAD' | 'category'>,
  selectedService: ProviderServiceItem | null | undefined,
  lang: LanguageCode
): CatalogBookingEstimate {
  if (!selectedService) {
    return {
      serviceTypeLabel: provider.category,
      estimatedMad: Math.max(50, Math.round(provider.fixedVisitFeeMAD + provider.hourlyRateMAD)),
      pricingModel: 'default',
      estimatedHours: 1,
    };
  }

  const label = lang === 'ar' ? selectedService.titleAr : selectedService.titleFr;
  const estimatedHours = Math.max(
    1,
    Math.round((selectedService.estimatedDurationMinutes || 60) / 60)
  );

  if (selectedService.pricingModel === 'fixed') {
    return {
      serviceTypeLabel: label,
      estimatedMad: Math.max(50, Math.round(selectedService.priceMad)),
      pricingModel: 'fixed',
      estimatedHours,
    };
  }

  if (selectedService.pricingModel === 'quote_required') {
    return {
      serviceTypeLabel: label,
      estimatedMad: Math.max(50, Math.round(provider.fixedVisitFeeMAD || 70)),
      pricingModel: 'quote_required',
      estimatedHours,
    };
  }

  // Hourly catalog service: callout visit fee + hourly rate × estimated duration hours
  return {
    serviceTypeLabel: label,
    estimatedMad: Math.max(
      50,
      Math.round(provider.fixedVisitFeeMAD + selectedService.priceMad * estimatedHours)
    ),
    pricingModel: 'hourly',
    estimatedHours,
  };
}

export interface SlotAvailabilityStatus {
  slot: TimeSlot;
  available: boolean;
  reason?: 'day_closed' | 'date_blocked' | 'already_booked';
}

/**
 * Evaluates all standard time slots for a target ISO date against the provider's
 * weekly schedule, blocked dates, and active schedule lock slots.
 */
export function getAvailableSlotsForDate(
  dateIso: string,
  schedule: ProviderAvailabilitySchedule | null | undefined,
  bookedSlots: ReadonlySet<TimeSlot> | readonly TimeSlot[]
): SlotAvailabilityStatus[] {
  const bookedSet = bookedSlots instanceof Set ? bookedSlots : new Set(bookedSlots);

  if (schedule?.blockedDates?.includes(dateIso)) {
    return TIME_SLOTS.map((slot) => ({
      slot,
      available: false,
      reason: 'date_blocked',
    }));
  }

  const weekday = getWeekdayKeyForIsoDate(dateIso);
  if (weekday && schedule?.days?.[weekday] && !schedule.days[weekday].enabled) {
    return TIME_SLOTS.map((slot) => ({
      slot,
      available: false,
      reason: 'day_closed',
    }));
  }

  return TIME_SLOTS.map((slot) => {
    if (bookedSet.has(slot)) {
      return { slot, available: false, reason: 'already_booked' };
    }
    return { slot, available: true };
  });
}

export interface RevisedQuoteInput {
  laborMad: number;
  materialsMad: number;
  note: string;
}

export function validateRevisedQuoteInput(
  input: RevisedQuoteInput,
  lang: LanguageCode
): { valid: boolean; totalMad: number; error?: string } {
  const labor = Math.round(Number(input.laborMad));
  const materials = Math.round(Number(input.materialsMad));
  const note = input.note.trim();

  if (!Number.isFinite(labor) || labor < 0 || labor > 100000) {
    return {
      valid: false,
      totalMad: 0,
      error:
        lang === 'ar'
          ? 'يرجى إدخال تكلفة يد عاملة صالحة بالدرهم.'
          : 'Veuillez saisir un montant de main-d’œuvre valide en MAD.',
    };
  }

  if (!Number.isFinite(materials) || materials < 0 || materials > 100000) {
    return {
      valid: false,
      totalMad: 0,
      error:
        lang === 'ar'
          ? 'يرجى إدخال تكلفة مواد ولوازم صالحة بالدرهم.'
          : 'Veuillez saisir un montant de matériaux/pièces valide en MAD.',
    };
  }

  const totalMad = labor + materials;
  if (totalMad < 50 || totalMad > 200000) {
    return {
      valid: false,
      totalMad,
      error:
        lang === 'ar'
          ? 'يجب أن يكون إجمالي عرض الثمن بين 50 و 200,000 درهم.'
          : 'Le montant total du devis doit être compris entre 50 et 200 000 MAD.',
    };
  }

  if (note.length < 5 || note.length > 400) {
    return {
      valid: false,
      totalMad,
      error:
        lang === 'ar'
          ? 'يرجى إضافة شرح موجز لتفاصيل التشخيص (5 أحرف على الأقل).'
          : 'Veuillez préciser le détail du diagnostic (5 à 400 caractères).',
    };
  }

  return { valid: true, totalMad };
}

export function buildRevisedQuoteRecord(
  input: RevisedQuoteInput,
  submittedAtIso = new Date().toISOString().slice(0, 10)
): RevisedQuoteRecord {
  const laborMad = Math.max(0, Math.round(Number(input.laborMad)));
  const materialsMad = Math.max(0, Math.round(Number(input.materialsMad)));
  return {
    laborMad,
    materialsMad,
    totalMad: laborMad + materialsMad,
    note: input.note.trim().slice(0, 400),
    status: 'pending',
    submittedAtIso,
  };
}

/**
 * Computes a bounded rolling average response time in minutes (1..1440)
 * when a provider responds to a pending booking request.
 */
export function computeUpdatedResponseMinutes(params: {
  previousAvgMinutes?: number | null;
  previousSamples?: number;
  createdAtMs: number;
  respondedAtMs: number;
}): number {
  const elapsedMinutes = Math.max(
    1,
    Math.min(1440, Math.round((params.respondedAtMs - params.createdAtMs) / 60000))
  );
  const prevAvg =
    typeof params.previousAvgMinutes === 'number' && params.previousAvgMinutes > 0
      ? params.previousAvgMinutes
      : null;
  const prevCount = Math.max(0, Math.round(params.previousSamples ?? (prevAvg ? 1 : 0)));

  if (!prevAvg || prevCount === 0) {
    return elapsedMinutes;
  }

  // Cap effective weight at 20 recent missions so response time stays responsive to recent behavior
  const weight = Math.min(20, prevCount);
  return Math.max(1, Math.min(1440, Math.round((prevAvg * weight + elapsedMinutes) / (weight + 1))));
}

/**
 * Evaluates whether an in-app notification should be displayed under the user's saved preferences.
 */
export function shouldShowNotificationForPreferences(
  notif: Pick<NotificationRecord, 'type'>,
  prefs: Pick<
    NotificationPreferencesRecord,
    'inAppEnabled' | 'bookingUpdates' | 'quotationUpdates' | 'chatMessages' | 'marketingUpdates'
  >
): boolean {
  if (!prefs.inAppEnabled) return false;
  switch (notif.type) {
    case 'booking_created':
    case 'booking_status':
      return prefs.bookingUpdates;
    case 'quote_received':
    case 'quote_accepted':
    case 'quote_rejected':
      return prefs.quotationUpdates;
    case 'message_received':
      return prefs.chatMessages;
    case 'review_received':
    case 'kyc_updated':
    case 'dispute_opened':
    case 'dispute_resolved':
    case 'system':
      return true;
    default:
      return true;
  }
}

function escapeCsvCell(value: string): string {
  const safe = value.replace(/"/g, '""');
  return /[",\n\r]/.test(safe) ? `"${safe}"` : safe;
}

/**
 * Generates an RFC-4180 CSV export of Admin compliance & moderation audit logs.
 */
export function generateAuditLogsCsv(logs: AdminAuditLog[]): string {
  const header = ['id', 'timestamp', 'adminEmail', 'actionType', 'targetCollection', 'targetId', 'summary'];
  const rows = logs.map((log) =>
    [
      log.id,
      log.createdAtIso,
      log.adminEmail,
      log.actionType,
      log.targetCollection,
      log.targetId,
      log.summary,
    ]
      .map((cell) => escapeCsvCell(String(cell ?? '')))
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}
