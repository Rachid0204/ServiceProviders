import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAdminAnalytics,
  escapeCsvCell,
  flattenProviderReviews,
  generateBookingsCsv,
  recalculateRatingAfterReviewRemoval,
} from './adminMetrics';
import { VETTED_PROVIDERS } from '../data/providers';
import type { BookingRecord, UserProfileRecord } from './marketplace';

const SAMPLE_BOOKINGS: BookingRecord[] = [
  {
    id: 'b-1',
    bookingRef: 'MK-101',
    clientId: 'c-1',
    clientName: 'Karim Tazi',
    clientPhone: '+212661234567',
    providerId: 'maalem-driss-casa',
    providerName: 'Maâlem Driss Berrada',
    providerPhone: '+212661428910',
    category: 'Plomberie',
    serviceType: 'Fuite',
    city: 'Casablanca',
    neighborhood: 'Maârif',
    addressPin: 'Rue Normandie',
    description: 'Remplacement mitigeur',
    preferredDate: '2026-11-22',
    preferredTimeSlot: '09:00 - 12:00',
    paymentMethod: 'cash_on_completion',
    paymentStatus: 'unpaid_cod',
    estimatedMad: 230,
    status: 'pending',
    createdAtIso: '2026-11-17',
  },
  {
    id: 'b-2',
    bookingRef: 'MK-102',
    clientId: 'c-1',
    clientName: 'Salma, "VIP" Client',
    clientPhone: '+212662000111',
    providerId: 'maalem-youssef-rabat',
    providerName: 'Maâlem Youssef El Amrani',
    providerPhone: '+212662845120',
    category: 'Électricité',
    serviceType: 'Tableau électrique',
    city: 'Rabat',
    neighborhood: 'Agdal',
    addressPin: 'Avenue de France',
    description: 'Mise aux normes',
    preferredDate: '2026-11-18',
    preferredTimeSlot: '14:00 - 17:00',
    paymentMethod: 'cmi_escrow',
    paymentStatus: 'escrow_held',
    estimatedMad: 260,
    status: 'completed',
    createdAtIso: '2026-11-16',
  },
  {
    id: 'b-3',
    bookingRef: 'MK-103',
    clientId: 'c-2',
    clientName: 'Omar Alaoui',
    clientPhone: '+212663000222',
    providerId: 'maalem-tarik-casa',
    providerName: 'Maâlem Tarik Zemmouri',
    providerPhone: '+212661904412',
    category: 'Climatisation',
    serviceType: 'Recharge gaz',
    city: 'Casablanca',
    neighborhood: 'Anfa',
    addressPin: 'Bd Anfa',
    description: 'Recharge R32',
    preferredDate: '2026-11-15',
    preferredTimeSlot: '18:00 - 20:00',
    paymentMethod: 'cmi_escrow',
    paymentStatus: 'paid',
    estimatedMad: 410,
    providerPayoutMad: 369,
    platformFeeMad: 41,
    status: 'reviewed',
    createdAtIso: '2026-11-15',
  },
  {
    id: 'b-4',
    bookingRef: 'MK-104',
    clientId: 'c-2',
    clientName: 'Omar Alaoui',
    clientPhone: '+212663000222',
    providerId: 'maalem-driss-casa',
    providerName: 'Maâlem Driss Berrada',
    providerPhone: '+212661428910',
    category: 'Plomberie',
    serviceType: 'Annulé',
    city: 'Casablanca',
    neighborhood: 'Maârif',
    addressPin: 'Maârif',
    description: 'Demande annulée',
    preferredDate: '2026-11-14',
    preferredTimeSlot: '09:00 - 12:00',
    paymentMethod: 'cmi_escrow',
    paymentStatus: 'refunded',
    estimatedMad: 500,
    refundedClientMad: 500,
    status: 'cancelled',
    createdAtIso: '2026-11-14',
  },
];

const SAMPLE_USERS: UserProfileRecord[] = [
  {
    uid: 'c-1',
    role: 'client',
    fullName: 'Karim Tazi',
    phone: '+212661234567',
    city: 'Casablanca',
    neighborhood: 'Maârif',
    languagePref: 'fr',
    verifiedBadge: false,
  },
  {
    uid: 'p-1',
    role: 'provider',
    fullName: 'Maâlem Driss Berrada',
    phone: '+212661428910',
    city: 'Casablanca',
    neighborhood: 'Maârif',
    languagePref: 'fr',
    verifiedBadge: true,
    specialty: 'Plomberie',
  },
  {
    uid: 'b-1',
    role: 'both',
    fullName: 'Sanaa El Idrissi',
    phone: '+212666148209',
    city: 'Marrakech',
    neighborhood: 'Guéliz',
    languagePref: 'fr',
    verifiedBadge: true,
    specialty: 'Ménage',
  },
];

test('computeAdminAnalytics excludes cancelled bookings from GMV and accurately computes escrow, 90/10 platform fees, refunds, and dual-role counts', () => {
  const providersWithPending = [
    ...VETTED_PROVIDERS,
    {
      ...VETTED_PROVIDERS[0],
      id: 'pending-provider-1',
      uid: 'pending-provider-1',
      verifiedBadge: false,
      cinVerified: false,
      reviewCount: 0,
    },
  ];

  const stats = computeAdminAnalytics(providersWithPending, SAMPLE_BOOKINGS, SAMPLE_USERS, 10);
  assert.equal(stats.totalGmvMad, 230 + 260 + 410);
  assert.equal(stats.escrowHeldMad, 260);
  assert.equal(stats.escrowHeldCount, 1);
  assert.equal(stats.settledRevenueMad, 410);
  assert.equal(stats.platformFeesMad, 41); // 10% of 410
  assert.equal(stats.providerPayoutsMad, 369); // 90% of 410
  assert.equal(stats.refundedTotalMad, 500);
  assert.equal(stats.totalBookingsCount, 4);
  assert.equal(stats.pendingBookingsCount, 1);
  assert.equal(stats.completedBookingsCount, 2);
  assert.equal(stats.cancelledBookingsCount, 1);
  assert.equal(stats.completionRatePct, 67);
  assert.equal(stats.verifiedProvidersCount, 8);
  assert.equal(stats.pendingCinCount, 1);
  assert.equal(stats.clientsCount, 1);
  assert.equal(stats.providersRoleCount, 1);
  assert.equal(stats.bothRoleCount, 1);
  assert.equal(stats.categoryBreakdown[0].category, 'Climatisation');
  assert.equal(stats.categoryBreakdown[0].revenueMad, 410);
});

test('computeAdminAnalytics handles empty datasets without NaN or division by zero', () => {
  const stats = computeAdminAnalytics([], [], []);
  assert.equal(stats.totalGmvMad, 0);
  assert.equal(stats.platformFeesMad, 0);
  assert.equal(stats.providerPayoutsMad, 0);
  assert.equal(stats.refundedTotalMad, 0);
  assert.equal(stats.completionRatePct, 0);
  assert.equal(stats.averageRating, 0);
  assert.equal(stats.categoryBreakdown.length, 12);
  assert.equal(stats.cityBreakdown.length, 6);
});

test('flattenProviderReviews aggregates and sorts provider reviews descending by date', () => {
  const reviews = flattenProviderReviews(VETTED_PROVIDERS);
  assert.ok(reviews.length >= 8);
  assert.ok(reviews[0].date >= reviews[reviews.length - 1].date);
  assert.ok(reviews.every((r) => r.providerId && r.rating >= 1 && r.rating <= 5));
});

test('generateBookingsCsv produces valid RFC-4180 CSV with quoted commas and double quotes', () => {
  const csv = generateBookingsCsv(SAMPLE_BOOKINGS);
  const lines = csv.split('\n');
  assert.equal(lines.length, 5);
  assert.ok(lines[0].startsWith('Ref,Date,TimeSlot,Client,ClientPhone'));
  assert.ok(lines[2].includes('"Salma, ""VIP"" Client"'));
  assert.ok(lines[2].includes(',260,cmi_escrow,escrow_held,completed'));
});

test('escapeCsvCell neutralizes spreadsheet formula injection prefixes (=, +, -, @, tab, CR)', () => {
  assert.equal(escapeCsvCell('=HYPERLINK("http://evil.example","click")'), '"\'=HYPERLINK(""http://evil.example"",""click"")"');
  assert.equal(escapeCsvCell('+212661234567'), "'+212661234567");
  assert.equal(escapeCsvCell('-1+1'), "'-1+1");
  assert.equal(escapeCsvCell('@SUM(A1:A2)'), "'@SUM(A1:A2)");
  assert.equal(escapeCsvCell('Normal Client'), 'Normal Client');
});

test('recalculateRatingAfterReviewRemoval accurately recalculates average and handles final review deletion', () => {
  // Removing a 1-star review from (4.0 avg over 4 reviews = 16 total) -> 15 / 3 = 5.0
  const res1 = recalculateRatingAfterReviewRemoval(4.0, 4, 1);
  assert.equal(res1.reviewCount, 3);
  assert.equal(res1.ratingAvg, 5.0);

  // Removing a 5-star review from (4.5 avg over 2 reviews = 9 total) -> 4 / 1 = 4.0
  const res2 = recalculateRatingAfterReviewRemoval(4.5, 2, 5);
  assert.equal(res2.reviewCount, 1);
  assert.equal(res2.ratingAvg, 4.0);

  // Removing the last review resets cleanly to 0 count and 5.0 default
  const resLast = recalculateRatingAfterReviewRemoval(3.0, 1, 3);
  assert.equal(resLast.reviewCount, 0);
  assert.equal(resLast.ratingAvg, 5.0);
});

test('SystemSettings optional supportWhatsAppPhone accepts empty string, normalizes valid Moroccan phones, and rejects malformed non-empty phones', async () => {
  const { DEFAULT_SYSTEM_SETTINGS, validateOptionalSupportWhatsAppPhone } = await import(
    './systemSettings'
  );

  // Default supportWhatsAppPhone must remain empty (no hardcoded fallback number)
  assert.equal(DEFAULT_SYSTEM_SETTINGS.supportWhatsAppPhone, '');

  // Empty or whitespace-only values are valid and normalize to ''
  assert.deepEqual(validateOptionalSupportWhatsAppPhone(''), { valid: true, normalized: '' });
  assert.deepEqual(validateOptionalSupportWhatsAppPhone('   '), { valid: true, normalized: '' });

  // Valid Moroccan mobile & landline formats normalize to strict +212[5-7]XXXXXXXX
  assert.deepEqual(validateOptionalSupportWhatsAppPhone('+212661234567'), {
    valid: true,
    normalized: '+212661234567',
  });
  assert.deepEqual(validateOptionalSupportWhatsAppPhone('06 61 23 45 67'), {
    valid: true,
    normalized: '+212661234567',
  });
  assert.deepEqual(validateOptionalSupportWhatsAppPhone('0701020304'), {
    valid: true,
    normalized: '+212701020304',
  });
  assert.deepEqual(validateOptionalSupportWhatsAppPhone('212522112233'), {
    valid: true,
    normalized: '+212522112233',
  });
  assert.deepEqual(validateOptionalSupportWhatsAppPhone('00212661234567'), {
    valid: true,
    normalized: '+212661234567',
  });

  // Malformed non-empty numbers are rejected
  for (const bad of ['12345', 'abc', '+33612345678', '+212123456789', '+21266123456', '+2126612345678']) {
    assert.equal(
      validateOptionalSupportWhatsAppPhone(bad).valid,
      false,
      `Expected invalid support phone "${bad}" to be rejected`
    );
  }
});
