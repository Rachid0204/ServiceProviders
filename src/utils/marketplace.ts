export type LanguageCode = 'fr' | 'ar';
export type UserRole = 'client' | 'provider' | 'both';
export type MoroccanCity = 'Casablanca' | 'Rabat' | 'Marrakech' | 'Tangier' | 'Fes' | 'Agadir';
export type ServiceCategory =
  | 'Plomberie'
  | 'Électricité'
  | 'Peinture'
  | 'Soutien Scolaire'
  | 'Ménage'
  | 'Climatisation'
  | 'Menuiserie'
  | 'Serrurerie'
  | 'Électroménager'
  | 'Jardinage'
  | 'Déménagement'
  | 'Maçonnerie';

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'reviewed'
  | 'cancelled';

export type PaymentMethod = 'cash_on_completion' | 'cmi_escrow';
export type PaymentStatus =
  | 'unpaid_cod'
  | 'escrow_held'
  | 'paid'
  | 'refunded'
  | 'disputed_split';

export type TimeSlot = '09:00 - 12:00' | '14:00 - 17:00' | '18:00 - 20:00';

export const TIME_SLOTS: TimeSlot[] = [
  '09:00 - 12:00',
  '14:00 - 17:00',
  '18:00 - 20:00',
];

export const MOROCCAN_CITIES: MoroccanCity[] = [
  'Casablanca',
  'Rabat',
  'Tangier',
  'Marrakech',
  'Fes',
  'Agadir',
];

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Plomberie',
  'Électricité',
  'Peinture',
  'Soutien Scolaire',
  'Ménage',
  'Climatisation',
  'Menuiserie',
  'Serrurerie',
  'Électroménager',
  'Jardinage',
  'Déménagement',
  'Maçonnerie',
];

export const DEFAULT_CATEGORY_IMAGE: Record<ServiceCategory, string> = {
  Plomberie: '/src/assets/images/service_plumbing_repair_1794980477189.jpg',
  Électricité: '/src/assets/images/service_electrical_smart_1794980478001.jpg',
  Peinture: '/src/assets/images/service_home_painting_1794980476260.jpg',
  'Soutien Scolaire': '/src/assets/images/service_tutoring.jpg',
  Ménage: '/src/assets/images/service_home_cleaning.jpg',
  Climatisation: '/src/assets/images/service_ac_hvac.jpg',
  Menuiserie: '/src/assets/images/hero_moroccan_craftsman_1794980476857.jpg',
  Serrurerie: '/src/assets/images/service_plumbing_repair_1794980477189.jpg',
  Électroménager: '/src/assets/images/service_electrical_smart_1794980478001.jpg',
  Jardinage: '/src/assets/images/service_home_cleaning.jpg',
  Déménagement: '/src/assets/images/hero_moroccan_craftsman_1794980476857.jpg',
  Maçonnerie: '/src/assets/images/service_home_painting_1794980476260.jpg',
};

// City center reference coordinates for geolocation fallback / city switching
export const CITY_COORDINATES: Record<
  MoroccanCity,
  { lat: number; lng: number; labelFr: string; labelAr: string }
> = {
  Casablanca: {
    lat: 33.5883,
    lng: -7.6325,
    labelFr: 'Casablanca — Maârif',
    labelAr: 'الدار البيضاء — المعاريف',
  },
  Rabat: {
    lat: 33.9985,
    lng: -6.8479,
    labelFr: 'Rabat — Agdal',
    labelAr: 'الرباط — أكدال',
  },
  Tangier: {
    lat: 35.7767,
    lng: -5.8039,
    labelFr: 'Tanger — Malabata',
    labelAr: 'طنجة — مالاباطا',
  },
  Marrakech: {
    lat: 31.6342,
    lng: -8.0128,
    labelFr: 'Marrakech — Guéliz',
    labelAr: 'مراكش — جيليز',
  },
  Fes: {
    lat: 34.0331,
    lng: -5.0003,
    labelFr: 'Fès — Champ de Course',
    labelAr: 'فاس — وسط المدينة',
  },
  Agadir: {
    lat: 30.4202,
    lng: -9.5982,
    labelFr: 'Agadir — Talborjt',
    labelAr: 'أكادير — تالبرجت',
  },
};

// Blueprint validation constants synced with firebase-blueprint.json & firestore.rules
export const PHONE_REGEX = /^\+212[5-7][0-9]{8}$/;
export const UID_REGEX = /^[a-zA-Z0-9_\-]+$/;
export const MIN_NAME_LEN = 2;
export const MAX_NAME_LEN = 80;
export const MIN_NEIGHBORHOOD_LEN = 2;
export const MAX_NEIGHBORHOOD_LEN = 80;
export const MAX_BIO_LEN = 500;
export const MIN_DESC_LEN = 10;
export const MAX_DESC_LEN = 600;

export interface UserProfileRecord {
  uid: string;
  role: UserRole;
  fullName: string;
  phone: string;
  city: MoroccanCity;
  neighborhood: string;
  languagePref: LanguageCode;
  verifiedBadge: boolean;
  specialty?: ServiceCategory | 'none';
  hourlyRateMad?: number;
  bio?: string;
  accountStatus?: 'active' | 'suspended';
  termsAcceptedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProviderLocation {
  lat: number;
  lng: number;
  city: MoroccanCity;
  quartier: string;
  quartierAr?: string;
}

export interface ProviderReview {
  id: string;
  authorName: string;
  quartier: string;
  rating: number;
  date: string;
  commentFr: string;
  commentAr: string;
  photoUrls?: string[];
}

export interface VettedProvider {
  uid: string;
  id: string;
  fullNameFr: string;
  fullNameAr: string;
  category: ServiceCategory;
  bioFr: string;
  bioAr: string;
  hourlyRateMAD: number;
  fixedVisitFeeMAD: number;
  experienceYears: number;
  skills: string[];
  skillsAr: string[];
  portfolioImages: string[];
  ratingAvg: number;
  reviewCount: number;
  isAvailableNow: boolean;
  verifiedBadge: boolean;
  cinVerified: boolean;
  cinNumberMasked: string;
  diplomaFr: string;
  diplomaAr: string;
  completedJobs: number;
  responseMinutes: number;
  phone: string;
  location: ProviderLocation;
  reviews: ProviderReview[];
  distanceKm?: number | null;
}

export interface ReviewCategoryBreakdown {
  punctuality?: number;
  quality?: number;
  value?: number;
}

export interface BookingRecord {
  id: string;
  bookingRef: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  providerId: string;
  providerName: string;
  providerPhone: string;
  category: ServiceCategory;
  serviceType: string;
  city: MoroccanCity;
  neighborhood: string;
  addressPin: string;
  description: string;
  problemPhotoUrl?: string;
  preferredDate: string;
  preferredTimeSlot: TimeSlot;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  estimatedMad: number;
  providerPayoutMad?: number;
  platformFeeMad?: number;
  refundedClientMad?: number;
  status: BookingStatus;
  cancellationReason?: string;
  cancelledBy?: 'client' | 'provider' | 'admin';
  rescheduleNote?: string;
  reviewRating?: number;
  reviewComment?: string;
  reviewCategories?: ReviewCategoryBreakdown;
  createdAtIso: string;
}

export type ServiceRequestRecord = BookingRecord;

export interface ChatMessageRecord {
  id: string;
  bookingId: string;
  clientId: string;
  providerId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  photoUrl?: string;
  createdAtIso: string;
}

export interface EscrowSplitBreakdown {
  totalMad: number;
  platformFeeMad: number;
  providerPayoutMad: number;
  refundedClientMad: number;
}

/**
 * Pure financial helper calculating exact integer MAD split for CMI Escrow:
 * - Standard release (`providerShareOfNetPct = 100`, `feePct = 10`): 10% platform fee, 90% provider payout, 0% client refund.
 * - Full refund (`providerShareOfNetPct = 0`, `feePct = 0`): 100% client refund, 0 provider payout, 0 platform fee.
 * - Dispute split (`providerShareOfNetPct = 50`, `feePct = 10`): 10% platform fee, 45% provider payout, 45% client refund (or exact integer remainder so sum === totalMad).
 */
export function calculateEscrowSplit(
  amountMad: number,
  feePct = 10,
  providerShareOfNetPct = 100
): EscrowSplitBreakdown {
  const totalMad = Math.max(0, Math.round(amountMad));
  const clampedFeePct = Math.max(0, Math.min(50, feePct));
  const clampedProviderShare = Math.max(0, Math.min(100, providerShareOfNetPct));

  if (clampedProviderShare === 0 && clampedFeePct === 0) {
    return {
      totalMad,
      platformFeeMad: 0,
      providerPayoutMad: 0,
      refundedClientMad: totalMad,
    };
  }

  const platformFeeMad = Math.round((totalMad * clampedFeePct) / 100);
  const netPoolMad = Math.max(0, totalMad - platformFeeMad);
  const providerPayoutMad = Math.round((netPoolMad * clampedProviderShare) / 100);
  const refundedClientMad = Math.max(0, totalMad - platformFeeMad - providerPayoutMad);

  return {
    totalMad,
    platformFeeMad,
    providerPayoutMad,
    refundedClientMad,
  };
}

/**
 * Generates collision-free Firestore booking document ID and human-readable MK- reference.
 */
export function generateBookingIds(): { bookingId: string; bookingRef: string } {
  const randomHex =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`;
  return {
    bookingId: `booking-${randomHex.slice(0, 16)}`,
    bookingRef: `MK-${randomHex.slice(0, 6).toUpperCase()}`,
  };
}

/**
 * Returns today's date in YYYY-MM-DD format in the Moroccan Africa/Casablanca timezone (AUD-006).
 */
export function getTodayIsoDate(now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Casablanca',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) {
      return `${y}-${m}-${d}`;
    }
  } catch {
    // Fallback if environment lacks Intl timeZone database
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates that an image URL uses a safe scheme (HTTPS, local bundled asset, or ephemeral preview blob).
 */
export function isSafeImageUrl(url: string | undefined, allowBlob = false): boolean {
  if (!url || url.length > 2048) return false;
  if (url.startsWith('https://')) return true;
  if (/^\/src\/assets\/images\/[a-zA-Z0-9_.\-]+$/.test(url)) return true;
  if (allowBlob && url.startsWith('blob:')) return true;
  return false;
}

/**
 * Computes the automatic refund patch when a provider or client cancels a booking:
 * - If `cmi_escrow` and `escrow_held` (and auto-refund is enabled for provider cancels),
 *   automatically refunds 100% of `estimatedMad` (`paymentStatus: 'refunded'`).
 * - If `cash_on_completion`, keeps `unpaid_cod` with 0 refund.
 */
export function computeCancellationSettlement(
  booking: Pick<BookingRecord, 'paymentMethod' | 'paymentStatus' | 'estimatedMad'>,
  cancelledBy: 'client' | 'provider' | 'admin',
  reason: string,
  autoRefundOnProviderCancel = true
): Pick<
  BookingRecord,
  | 'status'
  | 'paymentStatus'
  | 'providerPayoutMad'
  | 'platformFeeMad'
  | 'refundedClientMad'
  | 'cancellationReason'
  | 'cancelledBy'
> {
  const isEscrowHeld =
    booking.paymentMethod === 'cmi_escrow' &&
    (booking.paymentStatus === 'escrow_held' || booking.paymentStatus === undefined);
  const shouldRefund =
    isEscrowHeld && (cancelledBy !== 'provider' || autoRefundOnProviderCancel);

  if (shouldRefund) {
    return {
      status: 'cancelled',
      paymentStatus: 'refunded',
      providerPayoutMad: 0,
      platformFeeMad: 0,
      refundedClientMad: Math.round(booking.estimatedMad),
      cancellationReason: reason.trim().slice(0, 300),
      cancelledBy,
    };
  }

  return {
    status: 'cancelled',
    paymentStatus: booking.paymentStatus ?? 'unpaid_cod',
    providerPayoutMad: 0,
    platformFeeMad: 0,
    refundedClientMad: 0,
    cancellationReason: reason.trim().slice(0, 300),
    cancelledBy,
  };
}

/**
 * Normalizes a Moroccan phone input (e.g. "06 61 23 45 67", "212661234567", "+212 661-234567")
 * into strict +212[5-7]XXXXXXXX format when possible.
 */
export function normalizeMoroccanPhone(raw: string): string {
  const digitsAndPlus = raw.replace(/[\s\-().]/g, '');
  if (digitsAndPlus.startsWith('0') && digitsAndPlus.length === 10) {
    return '+212' + digitsAndPlus.slice(1);
  }
  if (digitsAndPlus.startsWith('212') && digitsAndPlus.length === 12) {
    return '+' + digitsAndPlus;
  }
  if (digitsAndPlus.startsWith('00212') && digitsAndPlus.length === 14) {
    return '+212' + digitsAndPlus.slice(5);
  }
  return digitsAndPlus;
}

export function isValidMoroccanPhone(phone: string): boolean {
  const normalized = normalizeMoroccanPhone(phone);
  return normalized.length >= 12 && normalized.length <= 16 && PHONE_REGEX.test(normalized);
}

/**
 * Formats a Moroccan phone number into digits-only `212...` and builds a `https://wa.me/{phone}?text={encoded}` link
 * pre-filled in French or Arabic with the booking reference and service category.
 * Returns empty string `''` when no valid Moroccan phone number is provided (AUD-010: never dial a fake fallback number).
 */
export function buildWhatsAppUrl(params: {
  phone: string;
  lang: LanguageCode;
  providerName: string;
  category: string;
  bookingRef?: string;
  serviceType?: string;
}): string {
  if (!params.phone || !isValidMoroccanPhone(params.phone)) {
    return '';
  }
  const normalized = normalizeMoroccanPhone(params.phone);
  const waPhone = normalized.replace(/^\+/, '').replace(/[^0-9]/g, '');
  if (!waPhone) {
    return '';
  }
  const refPartFr = params.bookingRef ? ` [Réf: ${params.bookingRef}]` : '';
  const refPartAr = params.bookingRef ? ` [مرجع الطلب: ${params.bookingRef}]` : '';
  const serviceDetail = params.serviceType ? ` (${params.serviceType})` : '';

  const message =
    params.lang === 'ar'
      ? `السلام عليكم ${params.providerName}، أتواصل معك عبر منصة مول الخدمة بخصوص خدمة ${params.category}${serviceDetail}${refPartAr}.`
      : `Bonjour ${params.providerName}, je vous contacte via Moul L'Khedma concernant une intervention en ${params.category}${serviceDetail}${refPartFr}.`;

  return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Recalculates a provider's average rating and total review count when a client submits a 1-5 star review.
 */
export function recalculateProviderRating(
  currentAvg: number,
  currentCount: number,
  newRating: number
): { ratingAvg: number; reviewCount: number } {
  const clampedRating = Math.max(1, Math.min(5, Math.round(newRating)));
  const safeCount = Math.max(0, currentCount);
  const nextCount = safeCount + 1;
  const totalPoints = currentAvg * safeCount + clampedRating;
  const nextAvg = Math.round((totalPoints / nextCount) * 10) / 10;
  return {
    ratingAvg: nextAvg,
    reviewCount: nextCount,
  };
}

/**
 * Enforces the strict sequential booking lifecycle state machine (matching firestore.rules):
 * - Client: pending/accepted -> cancelled; completed -> reviewed
 * - Provider: pending -> accepted | cancelled; accepted -> in_progress | cancelled; in_progress -> completed
 */
export function canTransitionBookingStatus(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
  actorRole: UserRole
): boolean {
  if (currentStatus === 'reviewed' || currentStatus === 'cancelled') {
    return false;
  }

  if (actorRole === 'client') {
    if (nextStatus === 'cancelled') {
      return currentStatus === 'pending' || currentStatus === 'accepted';
    }
    if (nextStatus === 'reviewed') {
      return currentStatus === 'completed';
    }
    return false;
  }

  // Provider or 'both' acting in provider mode (strictly sequential — no skipping from pending straight to completed)
  if (currentStatus === 'pending') {
    return nextStatus === 'accepted' || nextStatus === 'cancelled';
  }
  if (currentStatus === 'accepted') {
    return nextStatus === 'in_progress' || nextStatus === 'cancelled';
  }
  if (currentStatus === 'in_progress') {
    return nextStatus === 'completed';
  }
  return false;
}

/**
 * Computes the permitted next paymentStatus for a booking transition.
 * Cash on completion settles to 'paid' when completed; CMI escrow remains 'escrow_held'
 * until released by escrow settlement, or becomes 'refunded' when cancelled.
 */
export function getNextPaymentStatus(
  paymentMethod: PaymentMethod,
  currentPaymentStatus: PaymentStatus | undefined,
  nextStatus: BookingStatus
): PaymentStatus {
  const baseline: PaymentStatus =
    currentPaymentStatus ?? (paymentMethod === 'cmi_escrow' ? 'escrow_held' : 'unpaid_cod');
  if (nextStatus === 'completed' && paymentMethod === 'cash_on_completion') {
    return 'paid';
  }
  if (
    nextStatus === 'cancelled' &&
    paymentMethod === 'cmi_escrow' &&
    baseline === 'escrow_held'
  ) {
    return 'refunded';
  }
  return baseline;
}

/**
 * Formats an integer amount in Moroccan Dirhams (MAD / DH) according to active language.
 */
export function formatMadCurrency(amountMad: number, lang: LanguageCode): string {
  const rounded = Math.round(amountMad);
  const formattedNumber = rounded.toLocaleString('fr-MA');
  return lang === 'ar' ? `${formattedNumber} د.م.` : `${formattedNumber} DH`;
}

/**
 * Calculates great-circle Haversine distance in kilometers between two coordinates, rounded to 1 decimal place.
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: Partial<
    Record<
      'fullName' | 'phone' | 'city' | 'neighborhood' | 'role' | 'bio' | 'hourlyRateMad',
      string
    >
  >;
  normalizedPhone: string;
}

export function validateUserProfileInput(input: {
  role: string;
  fullName: string;
  phone: string;
  city: string;
  neighborhood: string;
  languagePref: LanguageCode;
  specialty?: string;
  hourlyRateMad?: number;
  bio?: string;
}): ProfileValidationResult {
  const errors: ProfileValidationResult['errors'] = {};
  const trimmedName = input.fullName.trim();
  const trimmedNeighborhood = input.neighborhood.trim();
  const normalizedPhone = normalizeMoroccanPhone(input.phone.trim());

  if (input.role !== 'client' && input.role !== 'provider' && input.role !== 'both') {
    errors.role =
      input.languagePref === 'ar'
        ? 'يرجى اختيار نوع الحساب'
        : 'Veuillez sélectionner un rôle valide.';
  }

  if (trimmedName.length < MIN_NAME_LEN || trimmedName.length > MAX_NAME_LEN) {
    errors.fullName =
      input.languagePref === 'ar'
        ? 'الاسم الكامل يجب أن يتكون من حرفين إلى 80 حرفاً'
        : 'Le nom complet doit contenir entre 2 et 80 caractères.';
  }

  if (!PHONE_REGEX.test(normalizedPhone)) {
    errors.phone =
      input.languagePref === 'ar'
        ? 'رقم الهاتف المغربي غير صالح (مثال: +212661234567)'
        : 'Numéro marocain invalide (format requis : +2126XXXXXXXX ou 06XXXXXXXX).';
  }

  if (!MOROCCAN_CITIES.includes(input.city as MoroccanCity)) {
    errors.city =
      input.languagePref === 'ar'
        ? 'يرجى اختيار مدينة مغربية مدعومة'
        : 'Veuillez choisir une ville marocaine prise en charge.';
  }

  if (
    trimmedNeighborhood.length < MIN_NEIGHBORHOOD_LEN ||
    trimmedNeighborhood.length > MAX_NEIGHBORHOOD_LEN
  ) {
    errors.neighborhood =
      input.languagePref === 'ar'
        ? 'يرجى إدخال اسم الحي (حرفين على الأقل)'
        : 'Veuillez préciser votre quartier (2 à 80 caractères).';
  }

  if (input.bio && input.bio.trim().length > MAX_BIO_LEN) {
    errors.bio =
      input.languagePref === 'ar'
        ? 'النبذة التعريفية لا يجب أن تتجاوز 500 حرف'
        : 'La biographie ne doit pas dépasser 500 caractères.';
  }

  if (
    (input.role === 'provider' || input.role === 'both') &&
    input.hourlyRateMad !== undefined &&
    (Number.isNaN(input.hourlyRateMad) ||
      input.hourlyRateMad < 50 ||
      input.hourlyRateMad > 50000)
  ) {
    errors.hourlyRateMad =
      input.languagePref === 'ar'
        ? 'التعريفة بالساعة يجب أن تكون بين 50 و 50000 د.م.'
        : 'Le tarif horaire doit être compris entre 50 et 50 000 DH.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedPhone,
  };
}

export interface RequestValidationResult {
  valid: boolean;
  errors: Partial<
    Record<
      | 'clientName'
      | 'clientPhone'
      | 'serviceType'
      | 'neighborhood'
      | 'addressPin'
      | 'description'
      | 'preferredDate'
      | 'preferredTimeSlot'
      | 'paymentMethod',
      string
    >
  >;
  normalizedPhone: string;
}

export function validateServiceRequestInput(
  input: {
    clientName: string;
    clientPhone: string;
    serviceType?: string;
    neighborhood: string;
    addressPin?: string;
    description: string;
    preferredDate: string;
    preferredTimeSlot?: string;
    paymentMethod?: string;
  },
  lang: LanguageCode
): RequestValidationResult {
  const errors: RequestValidationResult['errors'] = {};
  const normalizedPhone = normalizeMoroccanPhone(input.clientPhone.trim());

  if (
    input.clientName.trim().length < MIN_NAME_LEN ||
    input.clientName.trim().length > MAX_NAME_LEN
  ) {
    errors.clientName =
      lang === 'ar'
        ? 'يرجى إدخال الاسم الكامل (حرفين على الأقل)'
        : 'Veuillez saisir votre nom complet (2 à 80 caractères).';
  }

  if (!PHONE_REGEX.test(normalizedPhone)) {
    errors.clientPhone =
      lang === 'ar'
        ? 'رقم الهاتف المغربي غير صالح (مثال: +212661234567)'
        : 'Numéro marocain invalide (ex: +212661234567 ou 0661234567).';
  }

  if (input.serviceType !== undefined && input.serviceType.trim().length < 2) {
    errors.serviceType =
      lang === 'ar'
        ? 'يرجى اختيار نوع الخدمة المطلوبة'
        : 'Veuillez sélectionner le type de prestation.';
  }

  if (
    input.neighborhood.trim().length < MIN_NEIGHBORHOOD_LEN ||
    input.neighborhood.trim().length > MAX_NEIGHBORHOOD_LEN
  ) {
    errors.neighborhood =
      lang === 'ar' ? 'يرجى تحديد الحي السكني' : 'Veuillez indiquer votre quartier.';
  }

  if (
    input.addressPin !== undefined &&
    (input.addressPin.trim().length < 3 || input.addressPin.trim().length > 160)
  ) {
    errors.addressPin =
      lang === 'ar'
        ? 'يرجى إدخال العنوان أو نقطة الالتقاء (3 أحرف على الأقل)'
        : 'Veuillez préciser l’adresse ou le repère de localisation (min. 3 caractères).';
  }

  if (
    input.description.trim().length < MIN_DESC_LEN ||
    input.description.trim().length > MAX_DESC_LEN
  ) {
    errors.description =
      lang === 'ar'
        ? 'يرجى وصف الخدمة المطلوبة بالتفصيل (10 أحرف على الأقل)'
        : 'Veuillez décrire le besoin (minimum 10 caractères, maximum 600).';
  }

  if (!input.preferredDate || input.preferredDate.trim().length < 8) {
    errors.preferredDate =
      lang === 'ar'
        ? 'يرجى اختيار تاريخ التدخل المفضل'
        : 'Veuillez choisir une date souhaitée.';
  }

  if (
    input.preferredTimeSlot !== undefined &&
    !TIME_SLOTS.includes(input.preferredTimeSlot as TimeSlot)
  ) {
    errors.preferredTimeSlot =
      lang === 'ar'
        ? 'يرجى اختيار الفترة الزمنية المفضلة'
        : 'Veuillez sélectionner un créneau horaire.';
  }

  if (
    input.paymentMethod !== undefined &&
    input.paymentMethod !== 'cash_on_completion' &&
    input.paymentMethod !== 'cmi_escrow'
  ) {
    errors.paymentMethod =
      lang === 'ar'
        ? 'يرجى اختيار طريقة الدفع'
        : 'Veuillez choisir un mode de paiement valide.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedPhone,
  };
}

export type ProviderSortOption =
  | 'recommended'
  | 'rating_desc'
  | 'price_asc'
  | 'price_desc'
  | 'experience_desc'
  | 'distance_asc';

export interface ProviderFilterOptions {
  city: MoroccanCity | 'ALL';
  category: ServiceCategory | 'ALL';
  quartier?: string;
  maxHourlyRateMAD?: number;
  searchQuery: string;
  verifiedOnly: boolean;
  availableNowOnly?: boolean;
  favoritesOnly?: boolean;
  favoriteIds?: ReadonlySet<string> | string[];
  sortBy?: ProviderSortOption;
  userCoords?: { lat: number; lng: number } | null;
  nearMeActive?: boolean;
}

export function filterProviders(
  providers: VettedProvider[],
  filters: ProviderFilterOptions
): VettedProvider[] {
  const q = filters.searchQuery.trim().toLowerCase();
  const quartierQuery = (filters.quartier ?? '').trim().toLowerCase();
  const maxRate = filters.maxHourlyRateMAD ?? 10000;
  const favSet = filters.favoriteIds
    ? filters.favoriteIds instanceof Set
      ? filters.favoriteIds
      : new Set(filters.favoriteIds)
    : null;

  const filtered = providers
    .map((p) => {
      const distanceKm =
        filters.userCoords != null
          ? calculateDistanceKm(
              filters.userCoords.lat,
              filters.userCoords.lng,
              p.location.lat,
              p.location.lng
            )
          : null;
      return { ...p, distanceKm };
    })
    .filter((p) => {
      if (filters.city !== 'ALL' && p.location.city !== filters.city) return false;
      if (filters.category !== 'ALL' && p.category !== filters.category) return false;
      if (filters.verifiedOnly && !p.verifiedBadge) return false;
      if (filters.availableNowOnly && !p.isAvailableNow) return false;
      if (filters.favoritesOnly && (!favSet || !favSet.has(p.id))) return false;
      if (p.hourlyRateMAD > maxRate) return false;

      if (quartierQuery && quartierQuery !== 'all') {
        const qMatch =
          p.location.quartier.toLowerCase().includes(quartierQuery) ||
          (p.location.quartierAr ?? '').toLowerCase().includes(quartierQuery);
        if (!qMatch) return false;
      }

      if (!q) return true;

      const haystacks = [
        p.fullNameFr,
        p.fullNameAr,
        p.category,
        p.location.city,
        p.location.quartier,
        p.location.quartierAr ?? '',
        p.bioFr,
        p.bioAr,
        ...p.skills,
        ...p.skillsAr,
      ]
        .join(' ')
        .toLowerCase();

      return haystacks.includes(q);
    });

  if (filters.nearMeActive && filters.userCoords != null) {
    filtered.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
  } else if (filters.sortBy && filters.sortBy !== 'recommended') {
    switch (filters.sortBy) {
      case 'rating_desc':
        filtered.sort((a, b) => b.ratingAvg - a.ratingAvg || b.reviewCount - a.reviewCount);
        break;
      case 'price_asc':
        filtered.sort((a, b) => a.hourlyRateMAD - b.hourlyRateMAD);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.hourlyRateMAD - a.hourlyRateMAD);
        break;
      case 'experience_desc':
        filtered.sort((a, b) => b.experienceYears - a.experienceYears);
        break;
      case 'distance_asc':
        filtered.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
        break;
    }
  }

  return filtered;
}

// --- Client Open Job Board & Maâlem Proposal Contracts ---

export type JobUrgency = 'urgent' | 'this_week' | 'flexible';
export type JobPostStatus = 'open' | 'assigned' | 'closed' | 'cancelled';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface JobPostRecord {
  id: string;
  jobRef: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  title: string;
  category: ServiceCategory;
  city: MoroccanCity;
  neighborhood: string;
  description: string;
  budgetMad: number;
  urgency: JobUrgency;
  preferredDate: string;
  preferredTimeSlot: TimeSlot;
  problemPhotoUrl?: string;
  status: JobPostStatus;
  proposalCount: number;
  assignedProviderId?: string;
  assignedProviderName?: string;
  assignedBookingId?: string;
  createdAtIso: string;
}

export interface JobProposalRecord {
  id: string;
  jobId: string;
  clientId: string;
  providerId: string;
  providerName: string;
  providerPhone: string;
  providerCategory: ServiceCategory;
  providerCity: MoroccanCity;
  providerRating: number;
  providerVerified: boolean;
  proposedPriceMad: number;
  laborCostMad?: number;
  materialsCostMad?: number;
  validUntilIso?: string;
  warrantyNote?: string;
  estimatedDuration: string;
  message: string;
  status: ProposalStatus;
  createdAtIso: string;
}

export interface BookingTimelineEntry {
  status: BookingStatus;
  atIso: string;
  note?: string;
}

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAY_KEYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface ProviderWeeklySchedule {
  uid: string;
  days: Record<WeekdayKey, DayAvailability>;
  blockedDates: string[];
  acceptsUrgentSameDay: boolean;
  updatedAtIso?: string;
}

export function createDefaultWeeklySchedule(uid = ''): ProviderWeeklySchedule {
  return {
    uid,
    days: {
      mon: { enabled: true, slots: ['09:00 - 12:00', '14:00 - 17:00'] },
      tue: { enabled: true, slots: ['09:00 - 12:00', '14:00 - 17:00'] },
      wed: { enabled: true, slots: ['09:00 - 12:00', '14:00 - 17:00'] },
      thu: { enabled: true, slots: ['09:00 - 12:00', '14:00 - 17:00'] },
      fri: { enabled: true, slots: ['09:00 - 12:00', '14:00 - 17:00'] },
      sat: { enabled: true, slots: ['09:00 - 12:00'] },
      sun: { enabled: false, slots: [] },
    },
    blockedDates: [],
    acceptsUrgentSameDay: true,
  };
}

/**
 * Pure itemized quotation calculator ensuring integer MAD consistency:
 * totalMad === laborCostMad + materialsCostMad.
 */
export function computeQuotationTotals(laborCostMad: number, materialsCostMad: number): {
  laborCostMad: number;
  materialsCostMad: number;
  totalMad: number;
} {
  const labor = Math.max(0, Math.round(Number(laborCostMad) || 0));
  const materials = Math.max(0, Math.round(Number(materialsCostMad) || 0));
  return {
    laborCostMad: labor,
    materialsCostMad: materials,
    totalMad: labor + materials,
  };
}

export function isQuotationExpired(
  validUntilIso: string | undefined,
  todayIso = getTodayIsoDate()
): boolean {
  if (!validUntilIso || validUntilIso.length < 8) return false;
  return validUntilIso.slice(0, 10) < todayIso.slice(0, 10);
}

export function getDefaultQuoteValidUntilIso(daysAhead = 7): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return getTodayIsoDate(d);
}

/**
 * Deterministic lock ID preventing double-booking a Maâlem on the exact same date & time slot.
 */
export function buildScheduleLockId(
  providerId: string,
  dateIso: string,
  timeSlot: TimeSlot
): string {
  const safeDate = dateIso.replace(/[^0-9]/g, '').slice(0, 8);
  const safeSlot = timeSlot.replace(/[^0-9]/g, '');
  return `${providerId}_${safeDate}_${safeSlot}`;
}

/**
 * Checks whether an active (non-cancelled, non-completed) booking already occupies a provider's slot.
 */
export function hasScheduleConflict(
  existingBookings: Pick<BookingRecord, 'providerId' | 'preferredDate' | 'preferredTimeSlot' | 'status'>[],
  candidate: { providerId: string; preferredDate: string; preferredTimeSlot: TimeSlot }
): boolean {
  return existingBookings.some(
    (b) =>
      b.providerId === candidate.providerId &&
      b.preferredDate === candidate.preferredDate &&
      b.preferredTimeSlot === candidate.preferredTimeSlot &&
      (b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress')
  );
}

const JS_DAY_TO_WEEKDAY: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Parses a raw Firestore `/providerAvailability/{uid}` document snapshot into a typed `ProviderWeeklySchedule`.
 */
export function parseProviderAvailabilitySnapshot(
  uid: string,
  data: Record<string, unknown> | null | undefined
): ProviderWeeklySchedule | null {
  if (!data || typeof data !== 'object') return null;
  const defaults = createDefaultWeeklySchedule(uid);
  const days = { ...defaults.days };
  if (data.days && typeof data.days === 'object') {
    for (const key of WEEKDAY_KEYS) {
      const rawDay = (data.days as Record<string, { enabled?: boolean; slots?: unknown[] }>)[key];
      if (rawDay && typeof rawDay === 'object') {
        const validSlots = Array.isArray(rawDay.slots)
          ? rawDay.slots.filter((s): s is TimeSlot => TIME_SLOTS.includes(s as TimeSlot))
          : [];
        days[key as WeekdayKey] = {
          enabled: Boolean(rawDay.enabled),
          slots: validSlots,
        };
      }
    }
  }
  const blockedDates = Array.isArray(data.blockedDates)
    ? data.blockedDates
        .map(String)
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .slice(0, 60)
    : [];

  return {
    uid,
    days,
    blockedDates,
    acceptsUrgentSameDay: Boolean(data.acceptsUrgentSameDay ?? true),
  };
}

/**
 * Evaluates whether a provider's weekly calendar allows booking a specific date & time slot.
 */
export function isProviderSlotAvailable(
  schedule: ProviderWeeklySchedule | null | undefined,
  dateIso: string,
  timeSlot: TimeSlot
): boolean {
  if (!schedule) return true;
  const cleanDate = dateIso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return false;
  if (schedule.blockedDates.includes(cleanDate)) return false;
  const parsed = new Date(`${cleanDate}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  const dayKey = JS_DAY_TO_WEEKDAY[parsed.getUTCDay()];
  const dayCfg = schedule.days[dayKey];
  if (!dayCfg || !dayCfg.enabled) return false;
  return dayCfg.slots.includes(timeSlot);
}

// --- Phase 4: Messaging Inbox & Notifications Contracts ---

export interface ConversationMetadataRecord {
  bookingId: string;
  clientId: string;
  providerId: string;
  lastMessageText: string;
  lastSenderId: string;
  lastMessageAtMs: number;
  clientLastReadAtMs?: number;
  providerLastReadAtMs?: number;
  blockedByUid?: string;
}

export type NotificationType =
  | 'booking_created'
  | 'booking_status'
  | 'quote_received'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'message_received'
  | 'review_received'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'kyc_updated'
  | 'system';

export interface ProviderEarningsBreakdown {
  cashCollectedDirectlyMad: number;
  platformSettledEscrowMad: number;
  escrowHeldMad: number;
  pendingWithdrawalsMad: number;
  approvedWithdrawalsMad: number;
  platformHeldWithdrawableMad: number;
  hasPendingWithdrawal: boolean;
  canRequestWithdrawal: boolean;
}

/**
 * Computes a provider's financial metrics while strictly separating cash collected directly
 * on site (COD) from funds actually held by the platform (AUD-001).
 * While CMI escrow is disabled (cmiEscrowEnabled = false), platform-held withdrawable balance is always 0 MAD.
 */
export function computeProviderEarningsBreakdown(params: {
  bookings: Pick<
    BookingRecord,
    'paymentMethod' | 'paymentStatus' | 'estimatedMad' | 'providerPayoutMad'
  >[];
  withdrawals: { amountMad: number; status: 'pending' | 'approved' | 'frozen' | 'rejected' }[];
  platformFeePct: number;
  minWithdrawalMad: number;
  cmiEscrowEnabled?: boolean;
}): ProviderEarningsBreakdown {
  const {
    bookings,
    withdrawals,
    platformFeePct,
    minWithdrawalMad,
    cmiEscrowEnabled = false,
  } = params;

  let cashCollectedDirectlyMad = 0;
  let platformSettledEscrowMad = 0;
  let escrowHeldMad = 0;

  for (const b of bookings) {
    if (b.paymentMethod === 'cash_on_completion') {
      if (b.paymentStatus === 'paid') {
        cashCollectedDirectlyMad += Math.max(0, Math.round(b.estimatedMad || 0));
      }
    } else if (cmiEscrowEnabled && b.paymentMethod === 'cmi_escrow') {
      const split = calculateEscrowSplit(b.estimatedMad, platformFeePct, 100);
      if (b.paymentStatus === 'paid') {
        platformSettledEscrowMad += Math.max(
          0,
          Math.round(b.providerPayoutMad ?? split.providerPayoutMad)
        );
      } else if (b.paymentStatus === 'escrow_held') {
        escrowHeldMad += Math.max(0, Math.round(split.providerPayoutMad));
      }
    }
  }

  let pendingWithdrawalsMad = 0;
  let approvedWithdrawalsMad = 0;
  let hasPendingWithdrawal = false;

  for (const w of withdrawals) {
    if (w.status === 'pending') {
      hasPendingWithdrawal = true;
      pendingWithdrawalsMad += Math.max(0, Math.round(w.amountMad || 0));
    } else if (w.status === 'approved') {
      approvedWithdrawalsMad += Math.max(0, Math.round(w.amountMad || 0));
    }
  }

  const platformHeldWithdrawableMad = cmiEscrowEnabled
    ? Math.max(0, platformSettledEscrowMad - pendingWithdrawalsMad - approvedWithdrawalsMad)
    : 0;

  const minAllowed = Math.max(100, Math.round(minWithdrawalMad || 100));
  const canRequestWithdrawal =
    cmiEscrowEnabled &&
    !hasPendingWithdrawal &&
    platformHeldWithdrawableMad >= minAllowed;

  return {
    cashCollectedDirectlyMad,
    platformSettledEscrowMad,
    escrowHeldMad,
    pendingWithdrawalsMad,
    approvedWithdrawalsMad,
    platformHeldWithdrawableMad,
    hasPendingWithdrawal,
    canRequestWithdrawal,
  };
}

export interface NotificationRecord {
  id: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  titleFr: string;
  titleAr: string;
  bodyFr: string;
  bodyAr: string;
  linkPath: string;
  isRead: boolean;
  createdAtIso: string;
}

export interface NotificationPreferencesRecord {
  uid: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsWhatsAppEnabled: boolean;
  bookingUpdates: boolean;
  quotationUpdates: boolean;
  chatMessages: boolean;
  marketingUpdates: boolean;
}

export function createDefaultNotificationPreferences(uid = ''): NotificationPreferencesRecord {
  return {
    uid,
    inAppEnabled: true,
    emailEnabled: true,
    smsWhatsAppEnabled: true,
    bookingUpdates: true,
    quotationUpdates: true,
    chatMessages: true,
    marketingUpdates: false,
  };
}

/**
 * Determines whether a conversation has unread messages for the given participant UID.
 */
export function isConversationUnreadForUser(
  meta: ConversationMetadataRecord | null | undefined,
  uid: string
): boolean {
  if (!meta || !uid || meta.lastMessageAtMs <= 0) return false;
  if (meta.lastSenderId === uid) return false;
  const lastReadMs =
    uid === meta.clientId
      ? meta.clientLastReadAtMs ?? 0
      : uid === meta.providerId
      ? meta.providerLastReadAtMs ?? 0
      : 0;
  return meta.lastMessageAtMs > lastReadMs;
}

/**
 * Sanitizes notification deep-link paths so notifications only navigate to safe internal routes.
 */
export function sanitizeNotificationLinkPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw.slice(0, 160);
}

// --- Phase 5: Structured Disputes & Review Moderation Contracts ---

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'waiting_for_client'
  | 'waiting_for_provider'
  | 'resolved'
  | 'closed';

export type DisputeReason =
  | 'quality_issue'
  | 'no_show'
  | 'pricing_mismatch'
  | 'property_damage'
  | 'payment_issue'
  | 'other';

export const DISPUTE_REASONS: DisputeReason[] = [
  'quality_issue',
  'no_show',
  'pricing_mismatch',
  'property_damage',
  'payment_issue',
  'other',
];

export interface DisputeRecord {
  id: string;
  bookingId: string;
  bookingRef: string;
  clientId: string;
  providerId: string;
  openedByUid: string;
  openedByRole: 'client' | 'provider';
  reason: DisputeReason;
  description: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  resolutionSummary?: string;
  resolvedByUid?: string;
  createdAtIso: string;
  updatedAtIso?: string;
}

const VALID_DISPUTE_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  open: ['under_review', 'waiting_for_client', 'waiting_for_provider', 'resolved', 'closed'],
  under_review: ['waiting_for_client', 'waiting_for_provider', 'resolved', 'closed'],
  waiting_for_client: ['under_review', 'resolved', 'closed'],
  waiting_for_provider: ['under_review', 'resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

export function canTransitionDisputeStatus(from: DisputeStatus, to: DisputeStatus): boolean {
  return VALID_DISPUTE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateDisputeInput(
  input: {
    bookingId: string;
    reason: string;
    description: string;
    evidenceUrls?: string[];
  },
  lang: LanguageCode
): { valid: boolean; errors: Partial<Record<'bookingId' | 'reason' | 'description', string>> } {
  const errors: Partial<Record<'bookingId' | 'reason' | 'description', string>> = {};
  if (!input.bookingId || !UID_REGEX.test(input.bookingId)) {
    errors.bookingId =
      lang === 'ar' ? 'يرجى اختيار حجز صالح.' : 'Veuillez sélectionner une réservation valide.';
  }
  if (!DISPUTE_REASONS.includes(input.reason as DisputeReason)) {
    errors.reason =
      lang === 'ar' ? 'يرجى اختيار سبب النزاع.' : 'Veuillez sélectionner un motif de litige.';
  }
  const desc = input.description.trim();
  if (desc.length < 15 || desc.length > 1000) {
    errors.description =
      lang === 'ar'
        ? 'يرجى شرح تفاصيل النزاع (بين 15 و 1000 حرف).'
        : 'Veuillez expliquer le litige en détail (entre 15 et 1000 caractères).';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export const CATEGORY_SUGGESTED_SKILLS: Record<ServiceCategory, string[]> = {
  Plomberie: [
    'Détection de fuite sans casse',
    'Chauffe-eau gaz & électrique',
    'Robinetterie & sanitaires',
    'Débouchage canalisations',
    'Surpresseurs & pompes',
  ],
  Électricité: [
    'Tableaux électriques Schneider',
    'Dépannage court-circuit',
    'Éclairage LED & spots',
    'Interphonie & domotique',
    'Câblage réseau RJ45',
  ],
  Peinture: [
    'Peinture acrylique sans odeur',
    'Enduit lisse & ponçage',
    'Traitement anti-humidité',
    'Stucco & Khayal moderne',
    'Façades & boiseries',
  ],
  'Soutien Scolaire': [
    'Mathématiques BIOF & Mission',
    'Physique-Chimie Lycée',
    'Préparation Baccalauréat',
    'Français & Anglais',
    'Aide aux devoirs Primaire/Collège',
  ],
  Ménage: [
    'Ménage résidentiel complet',
    'Nettoyage vapeur salons marocains',
    'Fin de chantier',
    'Nettoyage tapis & canapés',
    'Lavage vitres & terrasses',
  ],
  Climatisation: [
    'Installation Split Inverter',
    'Recharge gaz R32 / R410A',
    'Nettoyage & désinfection clim',
    'Climatisation gainable',
    'Dépannage carte électronique',
  ],
  Menuiserie: [
    'Portes & placards bois sur mesure',
    'Menuiserie aluminium & PVC',
    'Cuisines équipées',
    'Réparation volets roulants',
    'Parquet & habillage mural',
  ],
  Serrurerie: [
    'Ouverture porte claquée 24/7',
    'Changement cylindre haute sécurité',
    'Serrure multipoints & blindage',
    'Ferronnerie & grilles de protection',
    'Reproduction & dépannage serrures',
  ],
  Électroménager: [
    'Réparation machine à laver',
    'Dépannage réfrigérateur & congélateur',
    'Four, plaque & hotte de cuisine',
    'Lave-vaisselle toutes marques',
    'Diagnostic carte électronique',
  ],
  Jardinage: [
    'Taille haies, palmiers & arbustes',
    'Entretien pelouse & gazon',
    'Installation arrosage automatique',
    'Création espaces verts & terrasses',
    'Traitement phytosanitaire',
  ],
  Déménagement: [
    'Déménagement appartement & villa',
    'Emballage & protection meubles',
    'Montage / démontage mobilier',
    'Transport national inter-villes',
    'Camion capitonné avec équipe',
  ],
  Maçonnerie: [
    'Pose carrelage, zellige & marbre',
    'Plâtre, faux plafond & gypse',
    'Étanchéité terrasse & toiture',
    'Rénovation salle de bain & cuisine',
    'Cloisons, enduits & gros œuvre',
  ],
};

// --- Phase 2: Provider Services Catalog & Private KYC Verification Contracts ---

export type ServicePricingModel =
  | 'fixed'
  | 'hourly'
  | 'starting_from'
  | 'quote_required'
  | 'callout_plus_work';

export const SERVICE_PRICING_MODELS: ServicePricingModel[] = [
  'fixed',
  'hourly',
  'starting_from',
  'quote_required',
  'callout_plus_work',
];

export interface ProviderServiceRecord {
  id: string;
  providerId: string;
  category: ServiceCategory;
  titleFr: string;
  titleAr: string;
  descriptionFr: string;
  descriptionAr: string;
  pricingModel: ServicePricingModel;
  priceMad: number;
  calloutFeeMad: number;
  estimatedDurationMinutes: number;
  isActive: boolean;
  createdAtIso: string;
}

export type KycVerificationStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'resubmission_required';

export interface ProviderKycDocumentRecord {
  uid: string;
  cinNumberMasked: string;
  cinFrontUrl: string;
  cinBackUrl: string;
  certificateUrl?: string;
  businessLicenseUrl?: string;
  status: KycVerificationStatus;
  rejectionReason?: string;
  reviewedByUid?: string;
  submittedAtIso?: string;
  reviewedAtIso?: string;
}

export function maskMoroccanCin(rawCin: string): string {
  const cleaned = rawCin.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.length < 4) return cleaned;
  const prefix = cleaned.slice(0, 2);
  const suffix = cleaned.slice(-2);
  return `${prefix}-••••${suffix}`;
}

export function validateProviderServiceInput(
  input: {
    titleFr: string;
    descriptionFr: string;
    category: string;
    pricingModel: string;
    priceMad: number;
    calloutFeeMad: number;
    estimatedDurationMinutes: number;
  },
  lang: LanguageCode
): {
  valid: boolean;
  errors: Partial<
    Record<
      'titleFr' | 'descriptionFr' | 'category' | 'pricingModel' | 'priceMad' | 'calloutFeeMad' | 'estimatedDurationMinutes',
      string
    >
  >;
} {
  const isAr = lang === 'ar';
  const errors: Partial<
    Record<
      'titleFr' | 'descriptionFr' | 'category' | 'pricingModel' | 'priceMad' | 'calloutFeeMad' | 'estimatedDurationMinutes',
      string
    >
  > = {};

  if (input.titleFr.trim().length < 4 || input.titleFr.trim().length > 100) {
    errors.titleFr = isAr
      ? 'عنوان الخدمة يجب أن يتكون من 4 إلى 100 حرف.'
      : 'Le titre du service doit contenir entre 4 et 100 caractères.';
  }
  if (input.descriptionFr.trim().length < 10 || input.descriptionFr.trim().length > 500) {
    errors.descriptionFr = isAr
      ? 'وصف الخدمة يجب أن يتكون من 10 إلى 500 حرف.'
      : 'La description doit contenir entre 10 et 500 caractères.';
  }
  if (!SERVICE_CATEGORIES.includes(input.category as ServiceCategory)) {
    errors.category = isAr ? 'يرجى اختيار فئة صالحة.' : 'Veuillez sélectionner une catégorie valide.';
  }
  if (!SERVICE_PRICING_MODELS.includes(input.pricingModel as ServicePricingModel)) {
    errors.pricingModel = isAr
      ? 'يرجى اختيار نموذج تسعير صالح.'
      : 'Veuillez sélectionner un modèle de tarification valide.';
  }
  const price = Math.round(Number(input.priceMad));
  if (
    input.pricingModel !== 'quote_required' &&
    (Number.isNaN(price) || price < 30 || price > 100000)
  ) {
    errors.priceMad = isAr
      ? 'السعر يجب أن يكون بين 30 و 100000 د.م.'
      : 'Le tarif doit être compris entre 30 DH et 100 000 DH.';
  }
  const callout = Math.round(Number(input.calloutFeeMad));
  if (Number.isNaN(callout) || callout < 0 || callout > 10000) {
    errors.calloutFeeMad = isAr
      ? 'واجب التنقل غير صالح (0 إلى 10000 د.م.).'
      : 'Frais de déplacement invalides (0 à 10 000 DH).';
  }
  const dur = Math.round(Number(input.estimatedDurationMinutes));
  if (Number.isNaN(dur) || dur < 15 || dur > 1440) {
    errors.estimatedDurationMinutes = isAr
      ? 'المدة التقديرية يجب أن تكون بين 15 و 1440 دقيقة.'
      : 'La durée estimée doit être comprise entre 15 et 1440 minutes.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function generateJobPostIds(): { jobId: string; jobRef: string } {
  const randomHex =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`;
  return {
    jobId: `job-${randomHex.slice(0, 16)}`,
    jobRef: `JOB-${randomHex.slice(0, 6).toUpperCase()}`,
  };
}

export interface JobPostValidationResult {
  valid: boolean;
  errors: Partial<
    Record<
      | 'clientName'
      | 'clientPhone'
      | 'title'
      | 'category'
      | 'city'
      | 'neighborhood'
      | 'description'
      | 'budgetMad'
      | 'preferredDate'
      | 'preferredTimeSlot',
      string
    >
  >;
  normalizedPhone: string;
}

export function validateJobPostInput(
  input: {
    clientName: string;
    clientPhone: string;
    title: string;
    category: string;
    city: string;
    neighborhood: string;
    description: string;
    budgetMad: number;
    preferredDate: string;
    preferredTimeSlot: string;
  },
  lang: LanguageCode
): JobPostValidationResult {
  const isAr = lang === 'ar';
  const errors: JobPostValidationResult['errors'] = {};
  const normalizedPhone = normalizeMoroccanPhone(input.clientPhone.trim());

  if (input.clientName.trim().length < MIN_NAME_LEN || input.clientName.trim().length > MAX_NAME_LEN) {
    errors.clientName = isAr
      ? 'يرجى إدخال اسمك الكامل (حرفين على الأقل).'
      : 'Veuillez saisir votre nom complet (2 à 80 caractères).';
  }
  if (!PHONE_REGEX.test(normalizedPhone)) {
    errors.clientPhone = isAr
      ? 'رقم الهاتف المغربي غير صالح (مثال: +212661234567).'
      : 'Numéro marocain invalide (ex: +212661234567 ou 0661234567).';
  }
  if (input.title.trim().length < 5 || input.title.trim().length > 120) {
    errors.title = isAr
      ? 'عنوان الطلب يجب أن يتكون من 5 إلى 120 حرفاً.'
      : 'Le titre de l’annonce doit contenir entre 5 et 120 caractères.';
  }
  if (!SERVICE_CATEGORIES.includes(input.category as ServiceCategory)) {
    errors.category = isAr ? 'يرجى اختيار التخصص المطلوب.' : 'Veuillez choisir une catégorie métier.';
  }
  if (!MOROCCAN_CITIES.includes(input.city as MoroccanCity)) {
    errors.city = isAr ? 'يرجى اختيار المدينة.' : 'Veuillez sélectionner une ville.';
  }
  if (
    input.neighborhood.trim().length < MIN_NEIGHBORHOOD_LEN ||
    input.neighborhood.trim().length > MAX_NEIGHBORHOOD_LEN
  ) {
    errors.neighborhood = isAr
      ? 'يرجى تحديد الحي السكني.'
      : 'Veuillez indiquer votre quartier (2 à 80 caractères).';
  }
  if (input.description.trim().length < 15 || input.description.trim().length > 800) {
    errors.description = isAr
      ? 'يرجى وصف تفاصيل الخدمة المطلوبة (15 حرفاً على الأقل).'
      : 'Décrivez votre besoin en détail (15 à 800 caractères).';
  }
  const roundedBudget = Math.round(Number(input.budgetMad));
  if (Number.isNaN(roundedBudget) || roundedBudget < 50 || roundedBudget > 100000) {
    errors.budgetMad = isAr
      ? 'الميزانية التقديرية يجب أن تكون بين 50 و 100000 د.م.'
      : 'Le budget estimé doit être compris entre 50 DH et 100 000 DH.';
  }
  if (!input.preferredDate || input.preferredDate.trim().length < 8) {
    errors.preferredDate = isAr ? 'يرجى اختيار التاريخ المفضل.' : 'Veuillez choisir une date souhaitée.';
  }
  if (!TIME_SLOTS.includes(input.preferredTimeSlot as TimeSlot)) {
    errors.preferredTimeSlot = isAr ? 'يرجى اختيار الفترة الزمنية.' : 'Veuillez choisir un créneau horaire.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedPhone,
  };
}

export function validateJobProposalInput(
  input: {
    proposedPriceMad: number;
    estimatedDuration: string;
    message: string;
  },
  lang: LanguageCode
): {
  valid: boolean;
  errors: Partial<Record<'proposedPriceMad' | 'estimatedDuration' | 'message', string>>;
} {
  const isAr = lang === 'ar';
  const errors: Partial<Record<'proposedPriceMad' | 'estimatedDuration' | 'message', string>> = {};
  const roundedPrice = Math.round(Number(input.proposedPriceMad));
  if (Number.isNaN(roundedPrice) || roundedPrice < 50 || roundedPrice > 100000) {
    errors.proposedPriceMad = isAr
      ? 'السعر المقترح يجب أن يكون بين 50 و 100000 د.م.'
      : 'Le tarif proposé doit être compris entre 50 DH et 100 000 DH.';
  }
  if (input.estimatedDuration.trim().length < 2 || input.estimatedDuration.trim().length > 64) {
    errors.estimatedDuration = isAr
      ? 'يرجى تحديد مدة الإنجاز أو موعد التدخل.'
      : 'Indiquez la durée estimée ou votre disponibilité (2 à 64 caractères).';
  }
  if (input.message.trim().length < 10 || input.message.trim().length > 500) {
    errors.message = isAr
      ? 'يرجى كتابة رسالة واضحة للزبون (10 أحرف على الأقل).'
      : 'Écrivez un message clair pour le client (10 à 500 caractères).';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface JobPostFilterOptions {
  category: ServiceCategory | 'ALL';
  city: MoroccanCity | 'ALL';
  quartier?: string;
  urgency: JobUrgency | 'ALL';
  minBudgetMad?: number;
  maxBudgetMad?: number;
  searchQuery: string;
}

const URGENCY_WEIGHT: Record<JobUrgency, number> = {
  urgent: 0,
  this_week: 1,
  flexible: 2,
};

export function filterJobPosts(
  jobs: JobPostRecord[],
  filters: JobPostFilterOptions
): JobPostRecord[] {
  const q = filters.searchQuery.trim().toLowerCase();
  const quartierQ = (filters.quartier ?? '').trim().toLowerCase();
  const minBudget = filters.minBudgetMad ?? 0;
  const maxBudget = filters.maxBudgetMad ?? 1000000;

  return jobs
    .filter((job) => {
      if (filters.category !== 'ALL' && job.category !== filters.category) return false;
      if (filters.city !== 'ALL' && job.city !== filters.city) return false;
      if (filters.urgency !== 'ALL' && job.urgency !== filters.urgency) return false;
      if (job.budgetMad < minBudget || job.budgetMad > maxBudget) return false;
      if (quartierQ && !job.neighborhood.toLowerCase().includes(quartierQ)) return false;

      if (!q) return true;
      const haystack = [
        job.title,
        job.description,
        job.category,
        job.city,
        job.neighborhood,
        job.jobRef,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => {
      if (URGENCY_WEIGHT[a.urgency] !== URGENCY_WEIGHT[b.urgency]) {
        return URGENCY_WEIGHT[a.urgency] - URGENCY_WEIGHT[b.urgency];
      }
      return b.createdAtIso.localeCompare(a.createdAtIso);
    });
}
