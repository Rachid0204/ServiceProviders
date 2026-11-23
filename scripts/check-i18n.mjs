import fs from 'node:fs';
import path from 'node:path';

/**
 * Verifies 100% French (fr) and Arabic (ar) translation key parity across:
 *   1. src/i18n/translations.ts (top-level keys, cities, categories)
 *   2. src/i18n/uiCopy.ts (all structured UI namespaces and keys, non-empty strings)
 *   3. Zero inline hardcoded bilingual `isAr ? '...' : '...'` UI copy ternaries in src/components & src/pages (AUD-017)
 */
const ROOT = process.cwd();

// 1. Validate src/i18n/translations.ts
const translationsPath = path.resolve(ROOT, 'src/i18n/translations.ts');
const translationsSrc = fs.readFileSync(translationsPath, 'utf8');
const frStart = translationsSrc.indexOf('fr: {');
const arStart = translationsSrc.indexOf('ar: {');

if (frStart === -1 || arStart === -1) {
  console.error('ERROR: Could not locate fr and ar translation blocks in src/i18n/translations.ts');
  process.exit(1);
}

const frBlock = translationsSrc.slice(frStart, arStart);
const arBlock = translationsSrc.slice(arStart);

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
  console.error('i18n parity failure in translations.ts:', { missingInAr, missingInFr });
  process.exit(1);
}

// 2. Validate src/i18n/uiCopy.ts recursive namespace parity & non-empty values
const uiCopyPath = path.resolve(ROOT, 'src/i18n/uiCopy.ts');
const uiCopySrc = fs.readFileSync(uiCopyPath, 'utf8');

function extractNamespaceMap(block) {
  const nsMap = {};
  let currentNs = null;
  for (const line of block.split('\n')) {
    const nsMatch = line.match(/^  ([a-zA-Z0-9_]+):\s*\{/);
    if (nsMatch) {
      currentNs = nsMatch[1];
      nsMap[currentNs] = {};
      continue;
    }
    if (line.match(/^  \},?$/)) {
      currentNs = null;
      continue;
    }
    if (currentNs) {
      const kvMatch = line.match(/^    ([a-zA-Z0-9_]+):\s*(".*"),$/);
      if (kvMatch) {
        const key = kvMatch[1];
        const val = JSON.parse(kvMatch[2]);
        nsMap[currentNs][key] = val;
      }
    }
  }
  return nsMap;
}

const uiFrStart = uiCopySrc.indexOf('export const UI_COPY_FR = {');
const uiFrEnd = uiCopySrc.indexOf('} as const;');
const uiArStart = uiCopySrc.indexOf('export const UI_COPY_AR: UiCopyDictionary = {');
const uiArEnd = uiCopySrc.indexOf('export function uiText');

if (uiFrStart === -1 || uiFrEnd === -1 || uiArStart === -1 || uiArEnd === -1) {
  console.error('ERROR: Could not locate UI_COPY_FR / UI_COPY_AR blocks in src/i18n/uiCopy.ts');
  process.exit(1);
}

const uiFrMap = extractNamespaceMap(uiCopySrc.slice(uiFrStart, uiFrEnd));
const uiArMap = extractNamespaceMap(uiCopySrc.slice(uiArStart, uiArEnd));
const uiFrNamespaces = Object.keys(uiFrMap).sort();
const uiArNamespaces = Object.keys(uiArMap).sort();

if (JSON.stringify(uiFrNamespaces) !== JSON.stringify(uiArNamespaces)) {
  console.error('i18n namespace mismatch in uiCopy.ts:', { uiFrNamespaces, uiArNamespaces });
  process.exit(1);
}

let uiKeyCount = 0;
for (const ns of uiFrNamespaces) {
  const fKeys = Object.keys(uiFrMap[ns]).sort();
  const aKeys = Object.keys(uiArMap[ns]).sort();
  if (JSON.stringify(fKeys) !== JSON.stringify(aKeys)) {
    console.error(`i18n key mismatch in uiCopy.ts namespace "${ns}"`, {
      missingInAr: fKeys.filter((k) => !aKeys.includes(k)),
      missingInFr: aKeys.filter((k) => !fKeys.includes(k)),
    });
    process.exit(1);
  }
  for (const k of fKeys) {
    if (!uiFrMap[ns][k].trim() || !uiArMap[ns][k].trim()) {
      console.error(`Empty translation string in uiCopy.ts: ${ns}.${k}`);
      process.exit(1);
    }
    uiKeyCount++;
  }
}

// 3. Enforce zero inline hardcoded `isAr ? 'string' : 'string'` UI copy ternaries in components & pages (AUD-017)
const IGNORED_TECHNICAL_PAIRS = new Set([
  'rtl|ltr',
  'ltr|rtl',
  'ar|fr',
  'fr|ar',
  'ar-MA|fr-MA',
  'fr-MA|ar-MA',
]);

function walkTsx(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkTsx(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function readLit(src, i) {
  const quote = src[i];
  if (quote !== "'" && quote !== '"' && quote !== '`') return null;
  let j = i + 1;
  let value = '';
  while (j < src.length) {
    const ch = src[j];
    if (ch === '\\') {
      j += 2;
      continue;
    }
    if (quote === '`' && ch === '$' && src[j + 1] === '{') {
      let depth = 1;
      j += 2;
      while (j < src.length && depth > 0) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') depth--;
        j++;
      }
      continue;
    }
    if (ch === quote) return { end: j + 1, value };
    value += ch;
    j++;
  }
  return null;
}

const inlineViolations = [];
for (const file of [...walkTsx(path.join(ROOT, 'src/components')), ...walkTsx(path.join(ROOT, 'src/pages'))]) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /\b(?:isAr|lang\s*===\s*'ar')\s*\?/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let idx = m.index + m[0].length;
    while (idx < src.length && /\s/.test(src[idx])) idx++;
    const s1 = readLit(src, idx);
    if (!s1) continue;
    idx = s1.end;
    while (idx < src.length && /\s/.test(src[idx])) idx++;
    if (src[idx] !== ':') continue;
    idx++;
    while (idx < src.length && /\s/.test(src[idx])) idx++;
    const s2 = readLit(src, idx);
    if (!s2) continue;
    if (IGNORED_TECHNICAL_PAIRS.has(`${s1.value}|${s2.value}`)) continue;
    const lineNum = src.slice(0, m.index).split('\n').length;
    inlineViolations.push(`${path.relative(ROOT, file)}:${lineNum}`);
  }
}

if (inlineViolations.length > 0) {
  console.error(
    `[check-i18n] FAIL — Found ${inlineViolations.length} inline bilingual string ternary(s) outside src/i18n/:`,
    inlineViolations.slice(0, 15)
  );
  process.exit(1);
}

console.log(
  `[check-i18n] PASS — ${frKeys.length} core keys + ${uiKeyCount} UI copy keys across ${uiFrNamespaces.length} namespaces verified with 100% FR/AR parity and 0 inline bilingual UI copy ternaries.`
);
