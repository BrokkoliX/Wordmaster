/**
 * Clean JSON dictionary data files in-place.
 *
 * Fixes five categories of bad entries that survive the Kaikki parser:
 *
 *   1. Non-vocabulary entries -- village/town names, surnames, given names,
 *      harmonic-variant suffixes, misspellings, obsolete spellings, etc.
 *   2. Inline grammar annotations -- "to be/(copulative) to be" → "to be"
 *   3. Bare slash-separated entries -- "in/at", "used in parallel/conditional"
 *      resolved to a single clean gloss or dropped when both sides are meta.
 *   4. Duplicate foreign words -- keeps the entry with the best frequency_rank.
 *   5. Duplicate English glosses -- prevents the same English word appearing
 *      twice under different foreign words; keeps the better-ranked entry.
 *
 * Operates on both base and enhanced files for every supported language.
 *
 * Usage:
 *   node scripts/cleanJsonDataFiles.js              # dry-run (report only)
 *   node scripts/cleanJsonDataFiles.js --apply       # rewrite files
 *   node scripts/cleanJsonDataFiles.js --lang=hu     # one language only
 */

const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const LANG_FLAG = process.argv.find(a => a.startsWith('--lang='));
const LANG_FILTER = LANG_FLAG ? LANG_FLAG.split('=')[1] : null;

// ── File sets ───────────────────────────────────────────────────────────

const DATA_DIR = path.resolve(__dirname, '../src/data');
const ENHANCED_DIR = path.resolve(__dirname, '../src/data/enhanced');

const FILE_SETS = [
  { lang: 'hu', label: 'Hungarian', files: [
    { path: path.join(DATA_DIR, 'words_hungarian.json'), side: 'source' },
    { path: path.join(DATA_DIR, 'words_hungarian_to_english.json'), side: 'target' },
    { path: path.join(ENHANCED_DIR, 'words_hungarian_enhanced.json'), side: 'source' },
    { path: path.join(ENHANCED_DIR, 'words_hungarian_to_english_enhanced.json'), side: 'target' },
  ]},
  { lang: 'fr', label: 'French', files: [
    { path: path.join(DATA_DIR, 'words_french.json'), side: 'source' },
    { path: path.join(DATA_DIR, 'words_french_to_english.json'), side: 'target' },
    { path: path.join(ENHANCED_DIR, 'words_french_to_english_enhanced.json'), side: 'target' },
  ]},
  { lang: 'de', label: 'German', files: [
    { path: path.join(DATA_DIR, 'words_german.json'), side: 'source' },
    { path: path.join(DATA_DIR, 'words_german_to_english.json'), side: 'target' },
    { path: path.join(ENHANCED_DIR, 'words_german_enhanced.json'), side: 'source' },
    { path: path.join(ENHANCED_DIR, 'words_german_to_english_enhanced.json'), side: 'target' },
  ]},
  { lang: 'es', label: 'Spanish', files: [
    { path: path.join(DATA_DIR, 'words_translated.json'), side: 'source' },
    { path: path.join(DATA_DIR, 'words_spanish_to_english.json'), side: 'target' },
    { path: path.join(ENHANCED_DIR, 'words_spanish_enhanced.json'), side: 'source' },
    { path: path.join(ENHANCED_DIR, 'words_spanish_to_english_enhanced.json'), side: 'target' },
  ]},
  { lang: 'pt', label: 'Portuguese', files: [
    { path: path.join(DATA_DIR, 'words_portuguese.json'), side: 'source' },
    { path: path.join(DATA_DIR, 'words_portuguese_to_english.json'), side: 'target' },
    { path: path.join(ENHANCED_DIR, 'words_portuguese_enhanced.json'), side: 'source' },
    { path: path.join(ENHANCED_DIR, 'words_portuguese_to_english_enhanced.json'), side: 'target' },
  ]},
  { lang: 'ru', label: 'Russian', files: [
    { path: path.join(DATA_DIR, 'words_russian.json'), side: 'source' },
    { path: path.join(DATA_DIR, 'words_russian_to_english.json'), side: 'target' },
    { path: path.join(ENHANCED_DIR, 'words_russian_enhanced.json'), side: 'source' },
    { path: path.join(ENHANCED_DIR, 'words_russian_to_english_enhanced.json'), side: 'target' },
  ]},
  { lang: 'it', label: 'Italian', files: [
    { path: path.join(DATA_DIR, 'words_italian.json'), side: 'source' },
    { path: path.join(DATA_DIR, 'words_italian_to_english.json'), side: 'target' },
  ]},
  { lang: 'pl', label: 'Polish', files: [
    { path: path.join(DATA_DIR, 'words_polish.json'), side: 'source' },
    { path: path.join(DATA_DIR, 'words_polish_to_english.json'), side: 'target' },
  ]},
];

// ── Non-vocabulary patterns ─────────────────────────────────────────────
// These entries are Wiktionary metadata, not useful vocabulary.

const NON_VOCAB_PATTERNS = [
  /^a (village|town|city|district|municipality|commune|borough) in\b/i,
  /\bcounty[,/]?\s*(Hungary|Romania|Slovakia|Serbia)/i,
  /^a (surname|habitational surname)$/i,
  /^a (male|female) given name$/i,
  /^a (male|female) given name from\b/i,
  /^a given name\b/i,
  /\bassimilated harmonic variant of\b/i,
  /^(obsolete|superseded|archaic|dated|eye dialect|pronunciation|alternative|nonstandard) spelling of\b/i,
  /^misspelling of\b/i,
  /^(rare |dialectal |regional )?variant of\b/i,
  /^(clipping|short form|contraction|ellipsis) of\b/i,
  /^(initialism|abbreviation|acronym) of\b/i,
  /^ISO\s+3166\b/i,
  /^the .*(letter|character) of the .*(alphabet|script)/i,
  /^the name of the .* (script letter|letter of)/i,
  /^the name of the (latin|cyrillic|greek|arabic|hebrew) script/i,
];

// ── Grammatical description patterns ────────────────────────────────────
// Entries that describe morphological forms rather than meanings.

const GRAMMATICAL_PATTERNS = [
  /\b(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|causal-final|sociative|partitive|comitative|distributive)\s+(singular|plural|of)\b/i,
  /^(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|causal-final|sociative|partitive|comitative|distributive)$/i,
  /^(first|second|third)[\\s-]person\b/i,
  /\b(inflection|conjugation|declension)\s+of\b/i,
  /\b(singular|plural)\s+of\b/i,
  /\bdisjunctive\s+form\b/i,
  /\balternative\s+form\s+of\b/i,
  /\b(comparative|superlative)\s+of\b/i,
  /\b(causative|frequentative|diminutive|augmentative|supine|gerund|participle)\s+of\b/i,
  /\b(apocopic|clitic|prevocalic)\s+form\s+of\b/i,
  /\b(feminine|masculine|neuter)\s+(singular\s+)?of\b/i,
  /^past[\\s-](tense|participle)\s+of\b/i,
  /^present[\\s-](tense|participle)\s+of\b/i,
  /^future[\\s-](tense)\s+of\b/i,
  /\b(imperative|subjunctive|conditional|infinitive)\s+of\b/i,
  /\bform\s+of\b/i,
  /\bletter\b.*\balphabet\b/i,
  /\bcalled\b.*\bwritten in\b/i,
  /\bversion anglaise\b/i,
  /\bdubbed in\b/i,
  /\benglish[\s-]language\b/i,
];

// ── Slash-entry resolution ───────────────────────────────────────────────
// The Kaikki parser joins the top two Wiktionary glosses with "/", producing
// entries that range from clean ("step/pace") to pure metadata
// ("introduces a subordinate clause/that").
//
// Strategy:
//   - If the slash is followed by a parenthetical annotation → keep the part
//     before the slash (existing behaviour: "to be/(copulative) to be" → "to be").
//   - Otherwise split on "/" and score each segment against META_SEGMENT_RE.
//     · Both meta  → return null  (entry will be dropped).
//     · One meta   → return the clean segment.
//     · Both clean → return the first segment (most common/frequent meaning).

const GRAMMAR_SLASH_RE = /\/\s*\([^)]+\)/;

// Words/phrases that signal a segment is a Wiktionary meta-description rather
// than a usable translation.
const META_SEGMENT_RE = /\b(used|indicates?|refers? to|introduces?|forms?|following|before|after|hither|thither|ergo|regardless|omitted|equivalent|possessive pronoun|copula|conditional|pluperfect|subjunctive|impure s|board games|Greek mythology|mythology|pan \(|response to|handing someone|parallel|copulative|upper-class|disjunctive|emphatic)\b/i;

function resolveSlash(text) {
  if (!text || !text.includes('/')) return text;

  // Handle the original "/(parenthetical)" case first.
  if (GRAMMAR_SLASH_RE.test(text)) {
    return text.split('/')[0].trim();
  }

  const parts = text.split('/').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return text;

  const isMeta = parts.map(p => META_SEGMENT_RE.test(p));

  // Both segments are metadata → drop the entry entirely.
  if (isMeta.every(Boolean)) return null;

  // One segment is metadata → keep the clean one.
  if (isMeta[0] && !isMeta[1]) return parts[1];
  if (!isMeta[0] && isMeta[1]) return parts[0];

  // Both are clean → keep the first (higher-frequency meaning).
  return parts[0];
}

// ── Parenthetical annotation cleanup ────────────────────────────────────
// Removes trailing parenthetical grammar labels that survived the parser,
// e.g. "(transitive)" or "(informal)".

const PAREN_ANNOTATION_TERMS = [
  'personal', 'interrogative', 'co-ordinating', 'coordinating',
  'subordinating', 'accompaniment', 'copulative', 'copular',
  'cardinal number', 'cardinal', 'ordinal', 'direct object',
  'indirect object', 'possessive', 'demonstrative', 'reflexive',
  'relative', 'definite', 'indefinite', 'intransitive', 'transitive',
  'impersonal', 'auxiliary', 'modal', 'determiner', 'article',
  'particle', 'interjection', 'numeral', 'informal', 'formal',
  'colloquial', 'now rare', 'geometry', 'archaic', 'dated',
  'literary', 'rare', 'vulgar', 'dialectal', 'regional',
  'computing', 'grammar', 'linguistics', 'music', 'medicine',
  'chemistry', 'biology', 'law', 'sports', 'military', 'history',
  'religion', 'cuisine', 'anatomy', 'mathematics', 'physics',
  'economics', 'politics', 'figurative', 'literally', 'obsolete',
];

const PAREN_RE = new RegExp(
  '\\((?:' +
    PAREN_ANNOTATION_TERMS
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|') +
  ')[^)]*\\)\\s*',
  'gi'
);

function stripParenAnnotations(text) {
  if (!text) return text;
  return text.replace(PAREN_RE, '').trim();
}

// ── Entry classification ────────────────────────────────────────────────

function isNonVocab(text) {
  if (!text) return false;
  for (const p of NON_VOCAB_PATTERNS) {
    if (p.test(text)) return true;
  }
  return false;
}

function isGrammatical(text) {
  if (!text) return false;
  for (const p of GRAMMATICAL_PATTERNS) {
    if (p.test(text)) return true;
  }
  return false;
}

function isTooLong(text) {
  return text && text.length > 80;
}

function isPlaceholder(text) {
  if (!text) return true;
  const t = text.trim();
  return !t || t.startsWith('[TRANSLATE') || t.startsWith('[NEED');
}

// ── Clean a single entry ────────────────────────────────────────────────
// Returns the cleaned entry or null if it should be removed.
// `englishSide` is 'source' when source_word is English (en→hu file),
// or 'target' when target_word is English (hu→en file).

function cleanEntry(entry, englishSide) {
  const eng = englishSide === 'source' ? 'source_word' : 'target_word';
  const foreign = englishSide === 'source' ? 'target_word' : 'source_word';

  let engText = entry[eng];
  let forText = entry[foreign];

  // Reject placeholders and overly long entries
  if (isPlaceholder(engText) || isPlaceholder(forText)) return null;
  if (isTooLong(engText) || isTooLong(forText)) return null;

  // Reject non-vocabulary entries (checked on English side)
  if (isNonVocab(engText)) return null;

  // Reject grammatical descriptions (checked on both sides)
  if (isGrammatical(engText) || isGrammatical(forText)) return null;

  // Resolve slash-separated glosses: keep the clean segment, drop if both are meta.
  engText = resolveSlash(engText);
  forText = resolveSlash(forText);
  if (!engText || !forText) return null;

  // Strip standalone parenthetical labels
  engText = stripParenAnnotations(engText);
  forText = stripParenAnnotations(forText);

  // Final trim
  engText = engText.replace(/\s{2,}/g, ' ').trim();
  forText = forText.replace(/\s{2,}/g, ' ').trim();

  // Reject if cleaning left an empty string
  if (!engText || !forText) return null;

  return { ...entry, [eng]: engText, [foreign]: forText };
}

// ── Deduplication ───────────────────────────────────────────────────────
// When the same foreign-language word appears multiple times with different
// English glosses, keep only the entry with the best (lowest) frequency_rank.

function deduplicate(entries, foreignKey) {
  const best = new Map();

  for (const entry of entries) {
    const key = entry[foreignKey].toLowerCase().trim();
    const existing = best.get(key);

    if (!existing) {
      best.set(key, entry);
      continue;
    }

    // Prefer the entry with the lower (better) frequency rank.
    // Fall back to shorter English text when ranks are equal.
    const existRank = existing.frequency_rank ?? Infinity;
    const newRank = entry.frequency_rank ?? Infinity;

    if (newRank < existRank) {
      best.set(key, entry);
    } else if (newRank === existRank) {
      const engKey = foreignKey === 'target_word' ? 'source_word' : 'target_word';
      if (entry[engKey].length < existing[engKey].length) {
        best.set(key, entry);
      }
    }
  }

  return [...best.values()];
}

// ── Process one file ────────────────────────────────────────────────────

function processFile(filePath, englishSide) {
  if (!fs.existsSync(filePath)) return null;

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const originalCount = raw.length;

  const reasons = { nonVocab: 0, grammatical: 0, tooLong: 0, placeholder: 0, slashResolved: 0, emptied: 0, duplicates: 0 };

  const engKey     = englishSide === 'source' ? 'source_word' : 'target_word';
  const foreignKey = englishSide === 'source' ? 'target_word' : 'source_word';

  // Phase 1 -- clean individual entries
  const cleaned = [];
  for (const entry of raw) {
    if (isPlaceholder(entry[engKey]) || isPlaceholder(entry[foreignKey])) { reasons.placeholder++; continue; }
    if (isTooLong(entry[engKey]) || isTooLong(entry[foreignKey])) { reasons.tooLong++; continue; }
    if (isNonVocab(entry[engKey])) { reasons.nonVocab++; continue; }
    if (isGrammatical(entry[engKey]) || isGrammatical(entry[foreignKey])) { reasons.grammatical++; continue; }

    // Pre-check slash resolution so we can count it separately in the report.
    // cleanEntry performs the actual transformation.
    if (entry[engKey].includes('/') || entry[foreignKey].includes('/')) {
      const resolved = resolveSlash(entry[engKey]);
      if (resolved === null) { reasons.slashResolved++; continue; }
    }

    const result = cleanEntry(entry, englishSide);
    if (!result) { reasons.emptied++; continue; }
    cleaned.push(result);
  }

  // Phase 2 -- deduplicate by foreign word
  const afterForeignDedup = deduplicate(cleaned, foreignKey);
  const foreignDupes = cleaned.length - afterForeignDedup.length;

  // Phase 3 -- deduplicate by English gloss so the same translation does not
  // appear under two different foreign words.
  const afterEngDedup = deduplicate(afterForeignDedup, engKey);
  const engDupes = afterForeignDedup.length - afterEngDedup.length;

  reasons.duplicates = foreignDupes + engDupes;

  // Sort by frequency_rank to keep consistent ordering
  afterEngDedup.sort((a, b) => (a.frequency_rank ?? Infinity) - (b.frequency_rank ?? Infinity));

  return { filePath, originalCount, finalCount: afterEngDedup.length, reasons, data: afterEngDedup };
}

// ── Main ────────────────────────────────────────────────────────────────

function main() {
  console.log('Dictionary JSON cleaner');
  console.log('Mode: ' + (APPLY ? 'APPLY (will rewrite files)' : 'DRY-RUN (report only)'));
  if (LANG_FILTER) console.log('Language filter: ' + LANG_FILTER);
  console.log('');

  const sets = LANG_FILTER
    ? FILE_SETS.filter(s => s.lang === LANG_FILTER)
    : FILE_SETS;

  if (sets.length === 0) {
    console.error('No matching language found for --lang=' + LANG_FILTER);
    process.exit(1);
  }

  let totalOriginal = 0;
  let totalFinal = 0;

  for (const set of sets) {
    console.log(`=== ${set.label} (${set.lang}) ===`);

    for (const file of set.files) {
      const result = processFile(file.path, file.side);
      if (!result) {
        console.log(`  [skip] ${path.basename(file.path)} -- file not found`);
        continue;
      }

      totalOriginal += result.originalCount;
      totalFinal += result.finalCount;
      const removed = result.originalCount - result.finalCount;

      console.log(`  ${path.basename(result.filePath)}`);
      console.log(`    before: ${result.originalCount.toLocaleString()}  after: ${result.finalCount.toLocaleString()}  removed: ${removed.toLocaleString()}`);
      console.log(`    breakdown: ${result.reasons.nonVocab} non-vocab, ${result.reasons.grammatical} grammatical, ${result.reasons.tooLong} too-long, ${result.reasons.placeholder} placeholder, ${result.reasons.slashResolved} slash-resolved, ${result.reasons.emptied} emptied, ${result.reasons.duplicates} duplicates`);

      if (APPLY) {
        fs.writeFileSync(result.filePath, JSON.stringify(result.data, null, 2) + '\n', 'utf-8');
        console.log('    -> file rewritten');
      }
    }

    console.log('');
  }

  console.log('--- Summary ---');
  console.log(`Total entries before: ${totalOriginal.toLocaleString()}`);
  console.log(`Total entries after:  ${totalFinal.toLocaleString()}`);
  console.log(`Total removed:        ${(totalOriginal - totalFinal).toLocaleString()}`);

  if (!APPLY) {
    console.log('');
    console.log('This was a DRY RUN. To rewrite files, run:');
    console.log('  node scripts/cleanJsonDataFiles.js --apply');
  }
}

main();
