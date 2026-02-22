/**
 * Clean JSON data files by removing grammatical descriptions and bad entries,
 * and by sanitizing translations that have embedded annotations.
 *
 * Two-pass approach:
 *   1. Try to SALVAGE entries by stripping grammatical annotations from
 *      otherwise good translations (e.g. "I  pronoun)" -> "I").
 *   2. REMOVE entries that are entirely grammatical descriptions with no
 *      usable translation left.
 *
 * Usage:
 *   node scripts/cleanJsonDataFiles.js            # dry-run (default)
 *   node scripts/cleanJsonDataFiles.js --apply     # write changes
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../src/data');
const APPLY = process.argv.includes('--apply');

// ── Patterns that indicate the ENTIRE text is a grammatical description ─
const FULL_DESCRIPTION_PATTERNS = [
  // Case forms: "accusative singular of az", "dative of ich: me"
  /^(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|causal-final|causal|sociative|partitive|comitative|distributive|temporal)\b/i,
  /\b(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|causal-final|causal|sociative|partitive|comitative|distributive|temporal)\s+(singular|plural|of)\b/i,

  // Person forms: "third-person singular present of sein"
  /^(first|second|third)[\s-]person\b/i,

  // Form-of patterns: "feminine singular of un", "plural of un"
  /^(singular|plural|feminine|masculine|neuter)\s+(singular|plural|of)\b/i,
  /\b(singular|plural)\s+of\b/i,
  /\bfeminine\s+(singular\s+)?of\b/i,
  /\bmasculine\s+(singular\s+)?of\b/i,

  // Tense forms: "past participle of van"
  /^past[\s-](tense|participle)\s+of\b/i,
  /^present[\s-](tense|participle)\s+of\b/i,
  /^future[\s-](tense)\s+of\b/i,

  // Morphological derivations
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

  // Alphabet descriptions
  /\bletter\b.*\balphabet\b/i,
  /\bcalled\b.*\bwritten in\b/i,
  /^(the|a)\s+(first|second|third|fourth|fifth|\d+).*(letter|character)/i,

  // ISO codes
  /\bISO\s+3166\b/i,

  // Media/language descriptions
  /\bversion anglaise\b/i,
  /\bdubbed in\b/i,
  /\benglish[\s-]language\b/i,

  // Full definition patterns (not translations)
  /^(Impersonal|Personal)\s+pronoun\s+used\s+to\b/i,
  /^the\s+plural\s+personal\s+pronoun\b/i,
  /^forms\s+the\s+/i,
];

/**
 * Try to extract a clean translation from a text that has grammatical
 * annotations mixed in. Returns the cleaned text, or null if nothing
 * usable remains.
 */
function sanitizeTranslation(text) {
  if (!text) return null;
  let t = text.trim();
  if (!t) return null;

  // Remove trailing orphaned closing parens like "I  pronoun)" -> "I"
  // Only when the paren-word looks like a grammatical term (lowercase, not a translation)
  t = t.replace(/\s{2,}\w+\)$/g, '').trim();
  // Remove stray " )" mid-text (e.g. "if )/when" -> "if/when")
  t = t.replace(/\s+\)/g, '').trim();
  t = t.replace(/\s{2,}/g, ' ').trim();

  // Parenthetical annotation terms to remove
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

  // Remove annotations like "(personal) " or "(cardinal number) "
  t = t.replace(annotationPattern, '').trim();

  // Also remove parenthetical text that contains these terms
  t = t.replace(/\([^)]*\b(?:first-person|second-person|third-person|singular|plural|demonstrative|pronoun|interrogative|personal|possessive|reflexive|relative|copulative|transitive|intransitive|subordinating|co-ordinating|informal|formal|colloquial)\b[^)]*\)/gi, '').trim();

  // Split on "/" and process each part
  if (t.includes('/')) {
    const parts = t.split('/');
    const cleanParts = parts
      .map(p => p.replace(annotationPattern, '').trim())
      .filter(p => {
        if (p.length === 0) return false;
        const lower = p.toLowerCase();
        // Remove parts that are descriptions, not translations
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

    // Deduplicate
    const unique = [...new Set(cleanParts)];
    if (unique.length > 0 && unique.length <= 3) {
      t = unique.join('/');
    } else if (unique.length > 3) {
      t = unique.slice(0, 2).join('/');
    } else {
      return null;
    }
  }

  // Remove "abbreviation of X/Y" patterns
  t = t.replace(/^abbreviation of\s+.*/i, '').trim();
  t = t.replace(/^initialism of\s+.*/i, '').trim();

  // Remove trailing commas, parentheses fragments
  t = t.replace(/[,;]\s*$/, '').trim();
  t = t.replace(/\s*\([^)]*$/, '').trim(); // unclosed opening paren
  t = t.replace(/^[^(]*\)\s*/, '').trim(); // orphaned closing paren at start

  // Remove stray double-spaces
  t = t.replace(/\s{2,}/g, ' ').trim();

  // If nothing usable remains
  if (!t || t.length === 0) return null;

  return t;
}

/**
 * Return true if `text` is entirely a grammatical description with no
 * usable translation that can be salvaged.
 */
function isUnsalvageableDescription(text) {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;

  // Placeholder patterns from data generation
  if (t.startsWith('[TRANSLATE') || t.startsWith('[NEED')) return true;

  // Too long to be a simple translation
  if (t.length > 80) return true;

  // Check full-description patterns
  for (const pattern of FULL_DESCRIPTION_PATTERNS) {
    if (pattern.test(t)) return true;
  }

  return false;
}

/**
 * Final validation: after sanitization, is the result a good entry?
 */
function isCleanTranslation(text) {
  if (!text) return false;
  const t = text.trim();
  if (!t || t.length === 0) return false;
  if (t.length > 60) return false;

  // Should not still contain grammatical terms after sanitization
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
  for (const p of badRemains) {
    if (p.test(t)) return false;
  }

  // Should not have more than 2 slashes
  if ((t.match(/\//g) || []).length > 2) return false;

  // Should not be a single special character or empty
  if (/^[^a-zA-Z\u00C0-\u024F\u0400-\u04FF]+$/.test(t)) return false;

  return true;
}

// ── Main ────────────────────────────────────────────────────────────────
function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  JSON DATA FILE CLEANER (with salvage)');
  console.log('  Mode: ' + (APPLY ? 'APPLY (will write files)' : 'DRY-RUN (preview only)'));
  console.log('='.repeat(60));
  console.log('');

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('words_') && f.endsWith('.json'));

  let grandTotalBefore = 0;
  let grandTotalAfter = 0;
  let grandSalvaged = 0;

  for (const fileName of files) {
    const filePath = path.join(DATA_DIR, fileName);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const before = data.length;
    grandTotalBefore += before;

    let salvaged = 0;
    const removedExamples = [];
    const salvagedExamples = [];

    const clean = [];

    for (const entry of data) {
      let src = entry.source_word;
      let tgt = entry.target_word;
      const origSrc = src;
      const origTgt = tgt;

      // Check if either field is an unsalvageable full description
      if (isUnsalvageableDescription(src)) {
        if (removedExamples.length < 3) {
          removedExamples.push({ src: (src || '').substring(0, 70), tgt: (tgt || '').substring(0, 30), reason: 'src_description' });
        }
        continue;
      }
      if (isUnsalvageableDescription(tgt)) {
        if (removedExamples.length < 3) {
          removedExamples.push({ src: (src || '').substring(0, 30), tgt: (tgt || '').substring(0, 70), reason: 'tgt_description' });
        }
        continue;
      }

      // Sanitize both fields
      src = sanitizeTranslation(src);
      tgt = sanitizeTranslation(tgt);

      if (!isCleanTranslation(src) || !isCleanTranslation(tgt)) {
        if (removedExamples.length < 3) {
          removedExamples.push({ src: (origSrc || '').substring(0, 70), tgt: (origTgt || '').substring(0, 30), reason: 'post_sanitize_fail' });
        }
        continue;
      }

      // Track if we actually changed anything
      if (src !== origSrc || tgt !== origTgt) {
        salvaged++;
        if (salvagedExamples.length < 5) {
          salvagedExamples.push({
            origSrc: (origSrc || '').substring(0, 50),
            origTgt: (origTgt || '').substring(0, 30),
            newSrc: src.substring(0, 40),
            newTgt: tgt.substring(0, 30),
          });
        }
      }

      entry.source_word = src;
      entry.target_word = tgt;
      clean.push(entry);
    }

    const after = clean.length;
    grandTotalAfter += after;
    grandSalvaged += salvaged;

    console.log(fileName);
    console.log(`  before: ${before.toLocaleString()}  after: ${after.toLocaleString()}  removed: ${(before - after).toLocaleString()} (${(((before - after) / before) * 100).toFixed(1)}%)  salvaged: ${salvaged}`);

    if (salvagedExamples.length > 0) {
      console.log('  salvaged examples:');
      salvagedExamples.forEach(e => {
        console.log(`    "${e.origSrc}" | "${e.origTgt}" -> "${e.newSrc}" | "${e.newTgt}"`);
      });
    }
    if (removedExamples.length > 0) {
      console.log('  removed examples:');
      removedExamples.forEach(e => {
        console.log(`    [${e.reason}] src="${e.src}" | tgt="${e.tgt}"`);
      });
    }
    console.log('');

    if (APPLY) {
      // Re-number frequency_rank
      clean.forEach((entry, idx) => {
        entry.frequency_rank = idx + 1;
      });

      fs.writeFileSync(filePath, JSON.stringify(clean, null, 2), 'utf-8');
      console.log(`  -> written to ${filePath}`);
      console.log('');
    }
  }

  const totalRemoved = grandTotalBefore - grandTotalAfter;

  console.log('='.repeat(60));
  console.log('GRAND TOTAL');
  console.log(`  Before:   ${grandTotalBefore.toLocaleString()}`);
  console.log(`  After:    ${grandTotalAfter.toLocaleString()}`);
  console.log(`  Removed:  ${totalRemoved.toLocaleString()} (${((totalRemoved / grandTotalBefore) * 100).toFixed(1)}%)`);
  console.log(`  Salvaged: ${grandSalvaged.toLocaleString()} (annotations cleaned)`);
  console.log('='.repeat(60));

  if (!APPLY) {
    console.log('');
    console.log('This was a DRY RUN. To apply changes, run:');
    console.log('  node scripts/cleanJsonDataFiles.js --apply');
    console.log('');
  }
}

main();
