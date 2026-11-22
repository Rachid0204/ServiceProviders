import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMoroccanPhone,
  isValidMoroccanPhone,
  formatMadCurrency,
  calculateDistanceKm,
  validateUserProfileInput,
  validateServiceRequestInput,
  filterProviders,
  buildWhatsAppUrl,
  recalculateProviderRating,
  canTransitionBookingStatus,
  getNextPaymentStatus,
  calculateEscrowSplit,
  computeCancellationSettlement,
  generateBookingIds,
  getTodayIsoDate,
  isSafeImageUrl,
  generateJobPostIds,
  validateJobPostInput,
  validateJobProposalInput,
  filterJobPosts,
  type JobPostRecord,
} from './marketplace';
import { VETTED_PROVIDERS } from '../data/providers';

test('normalizeMoroccanPhone converts local 06/07 numbers to +212 format', () => {
  assert.equal(normalizeMoroccanPhone('06 61 23 45 67'), '+212661234567');
  assert.equal(normalizeMoroccanPhone('0770-112233'), '+212770112233');
  assert.equal(normalizeMoroccanPhone('00212522987654'), '+212522987654');
  assert.equal(normalizeMoroccanPhone('+212 6 61 23 45 67'), '+212661234567');
});

test('isValidMoroccanPhone enforces +212[5-7]XXXXXXXX pattern', () => {
  assert.equal(isValidMoroccanPhone('+212661234567'), true);
  assert.equal(isValidMoroccanPhone('0661234567'), true);
  assert.equal(isValidMoroccanPhone('+212522334455'), true);
  assert.equal(isValidMoroccanPhone('+33612345678'), false);
  assert.equal(isValidMoroccanPhone('+212412345678'), false);
  assert.equal(isValidMoroccanPhone('12345'), false);
});

test('formatMadCurrency formats DH in French and د.م. in Arabic', () => {
  assert.ok(formatMadCurrency(250, 'fr').endsWith('DH'));
  assert.ok(formatMadCurrency(250, 'ar').endsWith('د.م.'));
});

test('calculateDistanceKm computes accurate Haversine distance in km', () => {
  const distCasa = calculateDistanceKm(33.5883, -7.6325, 33.5952, -7.6584);
  assert.ok(distCasa > 1.5 && distCasa < 4.0);
  const distCasaRabat = calculateDistanceKm(33.5883, -7.6325, 33.9985, -6.8479);
  assert.ok(distCasaRabat > 75 && distCasaRabat < 100);
});

test('buildWhatsAppUrl formats Moroccan phone as 212... without + and encodes localized message with booking reference', () => {
  const frUrl = buildWhatsAppUrl({
    phone: '+212661428910',
    lang: 'fr',
    providerName: 'Maâlem Driss Berrada',
    category: 'Plomberie',
    bookingRef: 'MK-101',
    serviceType: 'Détection de fuites',
  });
  assert.ok(frUrl.startsWith('https://wa.me/212661428910?text='));
  assert.ok(decodeURIComponent(frUrl).includes('MK-101'));
  assert.ok(decodeURIComponent(frUrl).includes('Plomberie'));

  const arUrl = buildWhatsAppUrl({
    phone: '06 62 19 84 33',
    lang: 'ar',
    providerName: 'المعلم الكتاني',
    category: 'الكهرباء',
    bookingRef: 'MK-202',
  });
  assert.ok(arUrl.startsWith('https://wa.me/212662198433?text='));
  assert.ok(decodeURIComponent(arUrl).includes('MK-202'));
  assert.ok(decodeURIComponent(arUrl).includes('مول الخدمة'));
});

test('recalculateProviderRating accurately updates ratingAvg and increments reviewCount', () => {
  const updated1 = recalculateProviderRating(4.8, 4, 5);
  assert.equal(updated1.reviewCount, 5);
  assert.equal(updated1.ratingAvg, 4.8);

  const updated2 = recalculateProviderRating(4.0, 1, 5);
  assert.equal(updated2.reviewCount, 2);
  assert.equal(updated2.ratingAvg, 4.5);
});

test('VETTED_PROVIDERS seeds 8 realistic Moroccan providers across Casablanca, Rabat, and Tangier', () => {
  assert.equal(VETTED_PROVIDERS.length, 8);
  const cities = new Set(VETTED_PROVIDERS.map((p) => p.location.city));
  assert.ok(cities.has('Casablanca'));
  assert.ok(cities.has('Rabat'));
  assert.ok(cities.has('Tangier'));
  for (const p of VETTED_PROVIDERS) {
    assert.ok(p.bioFr.length >= 10);
    assert.ok(p.bioAr.length >= 10);
    assert.ok(p.hourlyRateMAD >= 50);
    assert.ok(p.portfolioImages.length >= 1);
    assert.ok(p.skills.length >= 1);
    assert.ok(typeof p.location.lat === 'number');
    assert.ok(typeof p.location.lng === 'number');
  }
});

test('filterProviders filters by city, category, quartier, price range, availableNowOnly, and sorts by Near Me distance', () => {
  const casaOnly = filterProviders(VETTED_PROVIDERS, {
    city: 'Casablanca',
    category: 'ALL',
    searchQuery: '',
    verifiedOnly: false,
  });
  assert.ok(casaOnly.length >= 3);
  assert.ok(casaOnly.every((p) => p.location.city === 'Casablanca'));

  const availableNow = filterProviders(VETTED_PROVIDERS, {
    city: 'ALL',
    category: 'ALL',
    searchQuery: '',
    verifiedOnly: false,
    availableNowOnly: true,
  });
  assert.ok(availableNow.every((p) => p.isAvailableNow === true));

  const budgetFiltered = filterProviders(VETTED_PROVIDERS, {
    city: 'ALL',
    category: 'ALL',
    searchQuery: '',
    verifiedOnly: false,
    maxHourlyRateMAD: 150,
  });
  assert.ok(budgetFiltered.every((p) => p.hourlyRateMAD <= 150));

  const nearRabat = filterProviders(VETTED_PROVIDERS, {
    city: 'ALL',
    category: 'ALL',
    searchQuery: '',
    verifiedOnly: false,
    userCoords: { lat: 33.9985, lng: -6.8479 },
    nearMeActive: true,
  });
  assert.equal(nearRabat[0].location.city, 'Rabat');
  assert.ok((nearRabat[0].distanceKm ?? 999) <= (nearRabat[nearRabat.length - 1].distanceKm ?? 0));
});

test('validateUserProfileInput supports client, provider, and both (dual-role) accounts', () => {
  const validClient = validateUserProfileInput({
    role: 'client',
    fullName: 'Youssef El Amrani',
    phone: '0661234567',
    city: 'Casablanca',
    neighborhood: 'Maârif',
    languagePref: 'fr',
  });
  assert.equal(validClient.valid, true);
  assert.equal(validClient.normalizedPhone, '+212661234567');

  const validBothRole = validateUserProfileInput({
    role: 'both',
    fullName: 'Sanaa El Idrissi',
    phone: '0666148209',
    city: 'Marrakech',
    neighborhood: 'Guéliz',
    languagePref: 'fr',
    specialty: 'Ménage',
    hourlyRateMad: 120,
    bio: 'Consultante et prestataire certifiée à Marrakech.',
  });
  assert.equal(validBothRole.valid, true);
  assert.equal(validBothRole.normalizedPhone, '+212666148209');

  const invalidBothRate = validateUserProfileInput({
    role: 'both',
    fullName: 'Sanaa El Idrissi',
    phone: '0666148209',
    city: 'Marrakech',
    neighborhood: 'Guéliz',
    languagePref: 'fr',
    hourlyRateMad: 10, // Below 50 MAD threshold
  });
  assert.equal(invalidBothRate.valid, false);
  assert.ok(invalidBothRate.errors.hourlyRateMad);

  const resGood = validateServiceRequestInput(
    {
      clientName: 'Salma Bennani',
      clientPhone: '0662334455',
      serviceType: 'Détection de fuites',
      neighborhood: 'Agdal',
      addressPin: 'Rue Oued Ziz, Imm 14, Appt 5 — Agdal',
      description: 'Réparation urgente chauffe-eau électrique qui fuit dans la cuisine.',
      preferredDate: '2026-11-20',
      preferredTimeSlot: '09:00 - 12:00',
      paymentMethod: 'cash_on_completion',
    },
    'fr'
  );
  assert.equal(resGood.valid, true);
});

test('canTransitionBookingStatus enforces strict sequential transitions and terminal state locks', () => {
  // Provider sequential flow: pending -> accepted -> in_progress -> completed
  assert.equal(canTransitionBookingStatus('pending', 'accepted', 'provider'), true);
  assert.equal(canTransitionBookingStatus('pending', 'cancelled', 'provider'), true);
  assert.equal(canTransitionBookingStatus('pending', 'completed', 'provider'), false);
  assert.equal(canTransitionBookingStatus('pending', 'in_progress', 'provider'), false);
  assert.equal(canTransitionBookingStatus('accepted', 'in_progress', 'provider'), true);
  assert.equal(canTransitionBookingStatus('accepted', 'completed', 'provider'), false);
  assert.equal(canTransitionBookingStatus('in_progress', 'completed', 'provider'), true);
  assert.equal(canTransitionBookingStatus('in_progress', 'completed', 'both'), true);

  // Client transitions: pending/accepted -> cancelled; completed -> reviewed
  assert.equal(canTransitionBookingStatus('pending', 'cancelled', 'client'), true);
  assert.equal(canTransitionBookingStatus('accepted', 'cancelled', 'client'), true);
  assert.equal(canTransitionBookingStatus('in_progress', 'cancelled', 'client'), false);
  assert.equal(canTransitionBookingStatus('completed', 'reviewed', 'client'), true);
  assert.equal(canTransitionBookingStatus('pending', 'reviewed', 'client'), false);

  // Terminal states locked
  assert.equal(canTransitionBookingStatus('reviewed', 'cancelled', 'client'), false);
  assert.equal(canTransitionBookingStatus('cancelled', 'accepted', 'provider'), false);
});

test('getNextPaymentStatus settles COD to paid on completion, keeps CMI escrow held on completion, and auto-refunds CMI escrow on cancellation', () => {
  assert.equal(getNextPaymentStatus('cash_on_completion', 'unpaid_cod', 'completed'), 'paid');
  assert.equal(getNextPaymentStatus('cash_on_completion', 'unpaid_cod', 'in_progress'), 'unpaid_cod');
  assert.equal(getNextPaymentStatus('cmi_escrow', 'escrow_held', 'completed'), 'escrow_held');
  assert.equal(getNextPaymentStatus('cmi_escrow', 'escrow_held', 'cancelled'), 'refunded');
});

test('Phase 1 Math: calculateEscrowSplit computes exact 90% provider payout + 10% platform fee and invariant sum === totalMad', () => {
  // Standard 90/10 escrow release on 260 MAD
  const split260 = calculateEscrowSplit(260, 10, 100);
  assert.equal(split260.totalMad, 260);
  assert.equal(split260.platformFeeMad, 26);
  assert.equal(split260.providerPayoutMad, 234);
  assert.equal(split260.refundedClientMad, 0);
  assert.equal(
    split260.providerPayoutMad + split260.platformFeeMad + split260.refundedClientMad,
    260
  );

  // Standard 90/10 escrow release on 400 MAD
  const split400 = calculateEscrowSplit(400, 10, 100);
  assert.equal(split400.platformFeeMad, 40);
  assert.equal(split400.providerPayoutMad, 360);
  assert.equal(split400.refundedClientMad, 0);

  // 50/50 dispute split on 400 MAD (10% platform fee = 40, remaining 360 split 180 provider / 180 client)
  const dispute400 = calculateEscrowSplit(400, 10, 50);
  assert.equal(dispute400.platformFeeMad, 40);
  assert.equal(dispute400.providerPayoutMad, 180);
  assert.equal(dispute400.refundedClientMad, 180);
  assert.equal(
    dispute400.providerPayoutMad + dispute400.platformFeeMad + dispute400.refundedClientMad,
    400
  );

  // Full 100% client refund
  const fullRefund = calculateEscrowSplit(230, 0, 0);
  assert.equal(fullRefund.platformFeeMad, 0);
  assert.equal(fullRefund.providerPayoutMad, 0);
  assert.equal(fullRefund.refundedClientMad, 230);
});

test('Phase 1 Cancellation Auto-Refund: computeCancellationSettlement automatically refunds 100% of CMI escrow on provider or client cancel', () => {
  const escrowCancel = computeCancellationSettlement(
    {
      paymentMethod: 'cmi_escrow',
      paymentStatus: 'escrow_held',
      estimatedMad: 230,
    },
    'provider',
    'Indisponibilité urgente du Maâlem'
  );
  assert.equal(escrowCancel.status, 'cancelled');
  assert.equal(escrowCancel.paymentStatus, 'refunded');
  assert.equal(escrowCancel.refundedClientMad, 230);
  assert.equal(escrowCancel.providerPayoutMad, 0);
  assert.equal(escrowCancel.platformFeeMad, 0);
  assert.equal(escrowCancel.cancelledBy, 'provider');

  const codCancel = computeCancellationSettlement(
    {
      paymentMethod: 'cash_on_completion',
      paymentStatus: 'unpaid_cod',
      estimatedMad: 230,
    },
    'client',
    'Changement de programme'
  );
  assert.equal(codCancel.status, 'cancelled');
  assert.equal(codCancel.paymentStatus, 'unpaid_cod');
  assert.equal(codCancel.refundedClientMad, 0);

  // Respects autoRefundOnProviderCancel=false for provider cancellations
  const manualReviewCancel = computeCancellationSettlement(
    {
      paymentMethod: 'cmi_escrow',
      paymentStatus: 'escrow_held',
      estimatedMad: 300,
    },
    'provider',
    'Urgence familiale',
    false
  );
  assert.equal(manualReviewCancel.status, 'cancelled');
  assert.equal(manualReviewCancel.paymentStatus, 'escrow_held');
  assert.equal(manualReviewCancel.refundedClientMad, 0);
});

test('Security & Utility Helpers: isSafeImageUrl, generateBookingIds, and getTodayIsoDate', () => {
  assert.equal(isSafeImageUrl('https://firebasestorage.googleapis.com/v0/b/app/o/img.jpg'), true);
  assert.equal(isSafeImageUrl('/src/assets/images/plumber.jpg'), true);
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false);
  assert.equal(isSafeImageUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeImageUrl('http://insecure.example.com/a.jpg'), false);
  assert.equal(isSafeImageUrl(''), false);

  const idsA = generateBookingIds();
  const idsB = generateBookingIds();
  assert.match(idsA.bookingId, /^booking-[0-9a-f]{16}$/);
  assert.match(idsA.bookingRef, /^MK-[0-9A-F]{6}$/);
  assert.notEqual(idsA.bookingId, idsB.bookingId);

  const today = getTodayIsoDate();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

test('Job Board Helpers: generateJobPostIds, validateJobPostInput, validateJobProposalInput, and filterJobPosts', () => {
  const jIds = generateJobPostIds();
  assert.match(jIds.jobId, /^job-[0-9a-f]{16}$/);
  assert.match(jIds.jobRef, /^JOB-[0-9A-F]{6}$/);

  const validPost = validateJobPostInput(
    {
      clientName: 'Amina Tazi',
      clientPhone: '0661998877',
      title: 'Réparation fuite sous évier cuisine',
      category: 'Plomberie',
      city: 'Casablanca',
      neighborhood: 'Maârif',
      description: 'Le siphon sous l’évier fuit depuis ce matin et doit être remplacé.',
      budgetMad: 350,
      preferredDate: '2026-11-25',
      preferredTimeSlot: '09:00 - 12:00',
    },
    'fr'
  );
  assert.equal(validPost.valid, true);
  assert.equal(validPost.normalizedPhone, '+212661998877');

  const invalidPost = validateJobPostInput(
    {
      clientName: 'A',
      clientPhone: '123',
      title: 'Fix',
      category: 'Invalid',
      city: 'Paris',
      neighborhood: '',
      description: 'Court',
      budgetMad: 10,
      preferredDate: '',
      preferredTimeSlot: 'bad',
    },
    'ar'
  );
  assert.equal(invalidPost.valid, false);
  assert.ok(invalidPost.errors.title);
  assert.ok(invalidPost.errors.budgetMad);

  const validProposal = validateJobProposalInput(
    {
      proposedPriceMad: 300,
      estimatedDuration: 'Demain matin · 2h',
      message: 'Je peux intervenir demain matin avec un siphon neuf de qualité.',
    },
    'fr'
  );
  assert.equal(validProposal.valid, true);

  const sampleJobs: JobPostRecord[] = [
    {
      id: 'job-1',
      jobRef: 'JOB-111111',
      clientId: 'c1',
      clientName: 'Amina',
      clientPhone: '+212661111111',
      title: 'Fuite eau cuisine',
      category: 'Plomberie',
      city: 'Casablanca',
      neighborhood: 'Maârif',
      description: 'Remplacement siphon cuisine urgent.',
      budgetMad: 350,
      urgency: 'flexible',
      preferredDate: '2026-11-28',
      preferredTimeSlot: '09:00 - 12:00',
      status: 'open',
      proposalCount: 0,
      createdAtIso: '2026-11-20',
    },
    {
      id: 'job-2',
      jobRef: 'JOB-222222',
      clientId: 'c2',
      clientName: 'Omar',
      clientPhone: '+212662222222',
      title: 'Panne disjoncteur urgent',
      category: 'Électricité',
      city: 'Rabat',
      neighborhood: 'Agdal',
      description: 'Coupure totale tableau électrique salon.',
      budgetMad: 500,
      urgency: 'urgent',
      preferredDate: '2026-11-22',
      preferredTimeSlot: '14:00 - 17:00',
      status: 'open',
      proposalCount: 2,
      createdAtIso: '2026-11-21',
    },
  ];

  // Urgent jobs always sort first
  const allSorted = filterJobPosts(sampleJobs, {
    category: 'ALL',
    city: 'ALL',
    urgency: 'ALL',
    searchQuery: '',
  });
  assert.equal(allSorted[0].id, 'job-2');

  // Filter by category, city, and budget
  const casaPlumbing = filterJobPosts(sampleJobs, {
    category: 'Plomberie',
    city: 'Casablanca',
    quartier: 'maârif',
    urgency: 'ALL',
    minBudgetMad: 300,
    searchQuery: 'cuisine',
  });
  assert.equal(casaPlumbing.length, 1);
  assert.equal(casaPlumbing[0].id, 'job-1');
});

