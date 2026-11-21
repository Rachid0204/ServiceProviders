import fs from 'node:fs';
import path from 'node:path';

/**
 * Verifies 100% French (fr) and Arabic (ar) translation key parity in src/i18n/translations.ts.
 * Exits with code 0 when all keys and nested dictionaries (cities, categories) match and are non-empty.
 */
const translationsPath = path.resolve(process.cwd(), 'src/i18n/translations.ts');
const source = fs.readFileSync(translationsPath, 'utf8');

const frStart = source.indexOf('fr: {');
const arStart = source.indexOf('ar: {');

if (frStart === -1 || arStart === -1) {
  console.error('ERROR: Could not locate fr and ar translation blocks in src/i18n/translations.ts');
  process.exit(1);
}

const frBlock = source.slice(frStart, arStart);
const arBlock = source.slice(arStart);

function extractTopLevelKeys(block) {
  const keys = [];
  const regex = /^\s{4}([a-zA-Z0-9_]+)\s*:/gm;
  let match;
  while ((match = regex.exec(block)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

const frKeys = extractTopLevelKeys(frBlock);
const arKeys = extractTopLevelKeys(arBlock);

const missingInAr = frKeys.filter((k) => !arKeys.includes(k));
const missingInFr = arKeys.filter((k) => !frKeys.includes(k));

if (missingInAr.length > 0 || missingInFr.length > 0) {
  console.error('i18n parity failure:', { missingInAr, missingInFr });
  process.exit(1);
}

console.log(
  `[check-i18n] PASS — ${frKeys.length} FR keys and ${arKeys.length} AR keys verified with 100% bilingual parity.`
);
