/**
 * Verify the quality of cleaned data files.
 * Simulates the clean and shows sample entries.
 *
 * Usage: node scripts/verifyCleanData.js
 */

const fs = require('fs');
const path = require('path');

// Import the same cleaning logic
// (inline the key functions to keep this self-contained)

const FULL_DESCRIPTION_PATTERNS = [
  /^(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|causal-final|causal|sociative|partitive|comitative|distributive|temporal)\b/i,
  /\b(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|causal-final|causal|sociative|partitive|comitative|distributive|temporal)\s+(singular|plural|of)\b/i,
  /^(first|second|third)[\s-]person\b/i,
  /^(singular|plural|feminine|masculine|neuter)\s+(singular|plural|of)\b/i,
  /\b(singular|plural)\s+of\b/i,
  /\bfeminine\s+(singular\s+)?of\b/i,
  /\bmasculine\s+(singular\s+)?of\b/i,
  /^past[\s-](tense|participle)\s+of\b/i,
  /^present[\s-](tense|participle)\s+of\b/i,
  /^future[\s-](tense)\s+of\b/i,
  /\b(inflection|conjugation|declension)\s+of\b/i,
  /\bform\s+of\b/i,
  /\bdisjunctive\s+form\b/i,
  /\balternative\s+form\s+of\b/i,
  /\b(comparative|superlative)\s+of\b/i,
  /\b(causative|frequentative|diminutive|augmentative|supine|gerund|participle)\s+of\b/i,
  /\bcontraction\s+of\b/i,
  /\bapocopic\s+form\s+of\b/i,
  /\bclitic\s+form\s+of\b/i,
  /\bprevocalic\s+form\s+of\b/i,
  /\bletter\b.*\balphabet\b/i,
  /\bcalled\b.*\bwritten in\b/i,
  /^(the|a)\s+(first|second|third|fourth|fifth|\d+).*(letter|character)/i,
  /\bISO\s+3166\b/i,
  /\bversion anglaise\b/i,
  /\bdubbed in\b/i,
  /\benglish[\s-]language\b/i,
  /^(Impersonal|Personal)\s+pronoun\s+used\s+to\b/i,
  /^the\s+plural\s+personal\s+pronoun\b/i,
  /^forms\s+the\s+/i,
];

const annotationTerms = [
  'personal', 'interrogative', 'co-ordinating', 'coordinating',
  'subordinating', 'accompaniment', 'copulative', 'copular',
  'cardinal number', 'cardinal', 'ordinal', 'direct object',
  'indirect object', 'possessive', 'demonstrative', 'reflexive',
  'relative', 'definite', 'indefinite', 'intransitive', 'transitive',
  'impersonal', 'auxiliary', 'modal', 'determiner', 'article',
  'particle', 'interjection', 'numeral', 'informal', 'formal',
  'colloquial', 'local', 'temporal', 'pronoun', 'verb', 'noun',
  'adjective', 'adverb', 'preposition', 'conjunction',
  'first-person singular', 'first-person plural',
  'second-person singular', 'second-person plural',
  'third-person singular', 'third-person plural',
  'distal demonstrative pronoun', 'distal demonstrative',
  'proximal demonstrative', 'reciprocal',
];
const annotationPattern = new RegExp(
  '\\((?:' + annotationTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\)\\s*',
  'gi'
);

function sanitizeTranslation(text) {
  if (!text) return null;
  let t = text.trim();
  if (!t) return null;
  t = t.replace(/\s{2,}\w+\)$/g, '').trim();
  t = t.replace(/\s+\)/g, '').trim();
  t = t.replace(/\s{2,}/g, ' ').trim();
  t = t.replace(annotationPattern, '').trim();
  t = t.replace(/\([^)]*\b(?:first-person|second-person|third-person|singular|plural|demonstrative|pronoun|interrogative|personal|possessive|reflexive|relative|copulative|transitive|intransitive|subordinating|co-ordinating|informal|formal|colloquial)\b[^)]*\)/gi, '').trim();

  if (t.includes('/')) {
    const parts = t.split('/');
    const cleanParts = parts
      .map(p => p.replace(annotationPattern, '').trim())
      .filter(p => {
        if (p.length === 0) return false;
        const lower = p.toLowerCase();
        if (lower.startsWith('used ')) return false;
        if (lower.startsWith('substitutes ')) return false;
        if (lower.startsWith('followed ')) return false;
        if (lower.startsWith('refers ')) return false;
        if (lower.startsWith('indicates ')) return false;
        if (lower.startsWith('denotes ')) return false;
        if (lower.startsWith('literally ')) return false;
        if (/^a letter (in|of)/i.test(lower)) return false;
        if (/^after \w+ and before/i.test(lower)) return false;
        return true;
      });
    const unique = [...new Set(cleanParts)];
    if (unique.length > 0 && unique.length <= 3) t = unique.join('/');
    else if (unique.length > 3) t = unique.slice(0, 2).join('/');
    else return null;
  }

  t = t.replace(/^abbreviation of\s+.*/i, '').trim();
  t = t.replace(/^initialism of\s+.*/i, '').trim();
  t = t.replace(/[,;]\s*$/, '').trim();
  t = t.replace(/\s*\([^)]*$/, '').trim();
  t = t.replace(/^[^(]*\)\s*/, '').trim();
  t = t.replace(/\s{2,}/g, ' ').trim();
  if (!t || t.length === 0) return null;
  return t;
}

function isUnsalvageable(text) {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;
  if (t.startsWith('[TRANSLATE') || t.startsWith('[NEED')) return true;
  if (t.length > 80) return true;
  for (const p of FULL_DESCRIPTION_PATTERNS) { if (p.test(t)) return true; }
  return false;
}

const badRemains = [
  /\b(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|causal-final|causal|sociative|partitive)\b/i,
  /\b(inflection|conjugation|declension)\s+of\b/i,
  /\bform\s+of\b/i,
  /\bsingular\s+of\b/i,
  /\bplural\s+of\b/i,
  /\b(first|second|third)[\s-]person\b/i,
  /\bpast[\s-](tense|participle)\s+of\b/i,
  /\bpresent[\s-](tense|participle)\s+of\b/i,
  /\binterrogative\b/i,
  /\b(masculine|feminine|neuter)\b/i,
  /\bletter\b.*\balphabet\b/i,
  /\b(initialism|abbreviation|acronym)\b/i,
  /\b(refers to|used to|indicates|denotes)\b/i,
  /\bliterally\b/i,
  /\bversion anglaise\b/i,
  /\bdubbed in\b/i,
  /\bsubstitutes\s+for\b/i,
  /\bdisjunctive\b/i,
  /\bcontraction\s+of\b/i,
  /\bapocopic\b/i,
  /\bclitic\b/i,
  /\bprevocalic\b/i,
  /\bdistal\s+demonstrative\b/i,
];

function isClean(text) {
  if (!text) return false;
  const t = text.trim();
  if (!t || t.length > 60) return false;
  for (const p of badRemains) { if (p.test(t)) return false; }
  if ((t.match(/\//g) || []).length > 2) return false;
  if (/^[^a-zA-Z\u00C0-\u024F\u0400-\u04FF]+$/.test(t)) return false;
  return true;
}

function processEntry(entry) {
  let src = entry.source_word;
  let tgt = entry.target_word;
  if (isUnsalvageable(src) || isUnsalvageable(tgt)) return null;
  src = sanitizeTranslation(src);
  tgt = sanitizeTranslation(tgt);
  if (!isClean(src) || !isClean(tgt)) return null;
  return { ...entry, source_word: src, target_word: tgt };
}

// ── Main ────────────────────────────────────────────────────────────────
const DATA_DIR = path.resolve(__dirname, '../src/data');
const FILES = [
  { file: 'words_french.json', lang: 'French' },
  { file: 'words_german.json', lang: 'German' },
  { file: 'words_hungarian.json', lang: 'Hungarian' },
  { file: 'words_translated.json', lang: 'Spanish (en->es)' },
];

for (const { file, lang } of FILES) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) continue;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const clean = data.map(processEntry).filter(Boolean);

  console.log(`\n=== ${lang}: ${file} (${clean.length} clean of ${data.length}) ===`);
  console.log('First 30 clean entries:');
  clean.slice(0, 30).forEach((w, i) => {
    console.log(`  ${String(i + 1).padStart(3)}. ${w.target_word} -> ${w.source_word}`);
  });
}
