import test from 'node:test';
import assert from 'node:assert/strict';
import { SERVICE_CATEGORIES } from './marketplace';
import {
  TRADE_META,
  getTradeShortLabel,
  formatMaalemCount,
  formatProviderResultsLabel,
} from './tradeMeta';

test('TRADE_META covers all 12 service categories with unique icons and non-empty FR/AR labels', () => {
  const icons = new Set();
  for (const cat of SERVICE_CATEGORIES) {
    const meta = TRADE_META[cat];
    assert.ok(meta, `Missing TRADE_META entry for ${cat}`);
    assert.ok(meta.icon, `Missing icon for ${cat}`);
    icons.add(meta.icon);
    assert.ok(getTradeShortLabel(cat, 'fr').length > 0, `Empty FR label for ${cat}`);
    assert.ok(getTradeShortLabel(cat, 'ar').length > 0, `Empty AR label for ${cat}`);
  }
  assert.equal(icons.size, SERVICE_CATEGORIES.length, 'Every service category must have a unique icon');
});

test('formatMaalemCount formats singular and plural accurately in FR and AR', () => {
  assert.equal(formatMaalemCount(0, 'fr'), '0 Maâlems');
  assert.equal(formatMaalemCount(1, 'fr'), '1 Maâlem');
  assert.equal(formatMaalemCount(8, 'fr'), '8 Maâlems');

  assert.equal(formatMaalemCount(1, 'ar'), 'معلم واحد');
  assert.equal(formatMaalemCount(2, 'ar'), 'معلمان');
  assert.equal(formatMaalemCount(8, 'ar'), '8 معلمين');
  assert.equal(formatMaalemCount(12, 'ar'), '12 معلم');
});

test('formatProviderResultsLabel reflects verified filter and singular/plural accurately', () => {
  assert.equal(formatProviderResultsLabel(1, 'fr', false), '1 prestataire disponible');
  assert.equal(formatProviderResultsLabel(5, 'fr', false), '5 prestataires disponibles');
  assert.equal(formatProviderResultsLabel(1, 'fr', true), '1 prestataire vérifié');
  assert.equal(formatProviderResultsLabel(3, 'fr', true), '3 prestataires vérifiés');

  assert.equal(formatProviderResultsLabel(1, 'ar', false), 'مقدم خدمة متاح');
  assert.equal(formatProviderResultsLabel(2, 'ar', false), 'مقدما خدمة متاحان');
  assert.equal(formatProviderResultsLabel(6, 'ar', true), '6 معلمين موثقين');
});
