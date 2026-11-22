export type LanguageCode = 'fr' | 'ar';
export type UserRole = 'client' | 'provider' | 'both';
export type MoroccanCity = 'Casablanca' | 'Rabat' | 'Marrakech' | 'Tangier' | 'Fes' | 'Agadir';
export type ServiceCategory =
  | 'Plomberie'
  | 'Électricité'
  | 'Peinture'
  | 'Soutien Scolaire'
  | 'Ménage'
  | 'Climatisation';

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
];

export const DEFAULT_CATEGORY_IMAGE: Record<ServiceCategory, string> = {
  Plomberie: '/src/assets/images/service_plumbing_repair_1794980477189.jpg',
  Électricité: '/src/assets/images/service_electrical_smart_1794980478001.jpg',
  Peinture: '/src/assets/images/service_home_painting_1794980476260.jpg',
  'Soutien Scolaire': '/src/assets/images/service_tutoring.jpg',
  Ménage: '/src/assets/images/service_home_cleaning.jpg',
  Climatisation: '/src/assets/images/service_ac_hvac.jpg',
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
 * Returns today's local date in YYYY-MM-DD format for date inputs.
 */
export function getTodayIsoDate(): string {
  const now = new Date();
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
 */
export function buildWhatsAppUrl(params: {
  phone: string;
  lang: LanguageCode;
  providerName: string;
  category: string;
  bookingRef?: string;
  serviceType?: string;
}): string {
  const normalized = normalizeMoroccanPhone(params.phone);
  const waPhone = normalized.replace(/^\+/, '').replace(/[^0-9]/g, '') || '212661000000';
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

export interface ProviderFilterOptions {
  city: MoroccanCity | 'ALL';
  category: ServiceCategory | 'ALL';
  quartier?: string;
  maxHourlyRateMAD?: number;
  searchQuery: string;
  verifiedOnly: boolean;
  availableNowOnly?: boolean;
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
  estimatedDuration: string;
  message: string;
  status: ProposalStatus;
  createdAtIso: string;
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
};

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
