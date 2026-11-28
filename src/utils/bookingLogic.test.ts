import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRevisedQuoteRecord,
  computeCatalogBookingEstimate,
  computeUpdatedResponseMinutes,
  generateAuditLogsCsv,
  getAvailableSlotsForDate,
  resolveBookingActorRole,
  shouldShowNotificationForPreferences,
  validateRevisedQuoteInput,
} from './bookingLogic';
import { createDefaultAvailabilitySchedule, type ProviderServiceItem } from './marketplace';

test('resolveBookingActorRole identifies provider or client from booking UIDs regardless of route', () => {
  const booking = { clientId: 'client-1', providerId: 'provider-9' };
  assert.equal(resolveBookingActorRole(booking, 'provider-9', false), 'provider');
  assert.equal(resolveBookingActorRole(booking, 'client-1', true), 'client');
  assert.equal(resolveBookingActorRole(booking, 'other-user', true), 'provider');
  assert.equal(resolveBookingActorRole(null, 'client-1', false), 'client');
});

test('computeCatalogBookingEstimate calculates fixed, hourly, quote_required, and default totals', () => {
  const provider = {
    category: 'Plomberie' as const,
    hourlyRateMAD: 150,
    fixedVisitFeeMAD: 70,
  };

  const fixedService: ProviderServiceItem = {
    id: 'srv-1',
    providerId: 'p1',
    category: 'Plomberie',
    titleFr: 'Remplacement chauffe-eau',
    titleAr: 'تركيب سخان الماء',
    descriptionFr: 'Pose complète et test pression',
    descriptionAr: 'تركيب كامل واختبار الضغط',
    pricingModel: 'fixed',
    priceMad: 350,
    calloutFeeMad: 0,
    estimatedDurationMinutes: 90,
    isActive: true,
    createdAtIso: '2026-11-28',
  };

  assert.deepEqual(computeCatalogBookingEstimate(provider, fixedService, 'fr'), {
    serviceTypeLabel: 'Remplacement chauffe-eau',
    estimatedMad: 350,
    pricingModel: 'fixed',
    estimatedHours: 2,
  });

  const hourlyService: ProviderServiceItem = {
    ...fixedService,
    pricingModel: 'hourly',
    priceMad: 120,
    estimatedDurationMinutes: 120,
  };
  assert.equal(computeCatalogBookingEstimate(provider, hourlyService, 'ar').estimatedMad, 310);

  const quoteService: ProviderServiceItem = {
    ...fixedService,
    pricingModel: 'quote_required',
    priceMad: 0,
  };
  assert.equal(computeCatalogBookingEstimate(provider, quoteService, 'fr').estimatedMad, 70);

  assert.equal(computeCatalogBookingEstimate(provider, null, 'fr').estimatedMad, 220);
});

test('getAvailableSlotsForDate disables blocked dates, closed weekdays, and already-booked slots', () => {
  const schedule = createDefaultAvailabilitySchedule('p1');
  // Sunday is closed by default in createDefaultAvailabilitySchedule
  schedule.blockedDates = ['2026-12-01'];

  // Blocked date: all 3 slots unavailable
  const blockedRes = getAvailableSlotsForDate('2026-12-01', schedule, []);
  assert.equal(blockedRes.every((s) => !s.available && s.reason === 'date_blocked'), true);

  // Sunday (2026-11-29): all 3 slots unavailable (day_closed)
  const sundayRes = getAvailableSlotsForDate('2026-11-29', schedule, []);
  assert.equal(sundayRes.every((s) => !s.available && s.reason === 'day_closed'), true);

  // Open Monday (2026-11-30) with morning slot booked
  const openRes = getAvailableSlotsForDate('2026-11-30', schedule, ['09:00 - 12:00']);
  assert.equal(openRes[0].available, false);
  assert.equal(openRes[0].reason, 'already_booked');
  assert.equal(openRes[1].available, true);
  assert.equal(openRes[2].available, true);
});

test('validateRevisedQuoteInput and buildRevisedQuoteRecord enforce bounds and totals', () => {
  const invalidLow = validateRevisedQuoteInput({ laborMad: 20, materialsMad: 10, note: 'Test note' }, 'fr');
  assert.equal(invalidLow.valid, false);

  const invalidNote = validateRevisedQuoteInput({ laborMad: 150, materialsMad: 50, note: 'ok' }, 'ar');
  assert.equal(invalidNote.valid, false);

  const valid = validateRevisedQuoteInput(
    { laborMad: 200, materialsMad: 180, note: 'Remplacement vanne principale et joint cuivre' },
    'fr'
  );
  assert.equal(valid.valid, true);
  assert.equal(valid.totalMad, 380);

  const record = buildRevisedQuoteRecord(
    { laborMad: 200, materialsMad: 180, note: 'Remplacement vanne principale' },
    '2026-11-28'
  );
  assert.equal(record.totalMad, 380);
  assert.equal(record.status, 'pending');
});

test('computeUpdatedResponseMinutes bounds values and blends rolling averages', () => {
  const first = computeUpdatedResponseMinutes({
    createdAtMs: 1_000_000,
    respondedAtMs: 1_000_000 + 18 * 60_000,
  });
  assert.equal(first, 18);

  const blended = computeUpdatedResponseMinutes({
    previousAvgMinutes: 20,
    previousSamples: 3,
    createdAtMs: 1_000_000,
    respondedAtMs: 1_000_000 + 40 * 60_000,
  });
  assert.equal(blended, 25);
});

test('shouldShowNotificationForPreferences filters by category and master inAppEnabled switch', () => {
  const prefs = {
    inAppEnabled: true,
    bookingUpdates: true,
    quotationUpdates: false,
    chatMessages: true,
    marketingUpdates: false,
  };
  assert.equal(shouldShowNotificationForPreferences({ type: 'booking_status' }, prefs), true);
  assert.equal(shouldShowNotificationForPreferences({ type: 'quote_received' }, prefs), false);
  assert.equal(shouldShowNotificationForPreferences({ type: 'kyc_updated' }, prefs), true);
  assert.equal(
    shouldShowNotificationForPreferences({ type: 'booking_status' }, { ...prefs, inAppEnabled: false }),
    false
  );
});

test('generateAuditLogsCsv escapes commas and quotes cleanly', () => {
  const csv = generateAuditLogsCsv([
    {
      id: 'log-1',
      adminUid: 'admin-1',
      adminEmail: 'admin@moul-lkhedma.ma',
      actionType: 'document_viewed',
      targetCollection: 'providerDocuments',
      targetId: 'prov-1',
      summary: 'Consultation CIN, "Recto"',
      createdAtIso: '2026-11-28 10:00',
    },
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].includes('"Consultation CIN, ""Recto"""'));
});
