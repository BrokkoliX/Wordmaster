#!/usr/bin/env node

/**
 * Pipeline Stage 2: NORMALIZE
 *
 * Parses raw Kaikki.org JSONL dictionaries and FrequencyWords files
 * into a common intermediate format.  Outputs one JSON file per
 * language (not per pair) in dictionaries/normalized/.
 *
 * Usage:
 *   node pipeline/normalize.js                  # all languages
 *   node pipeline/normalize.js --lang=fr        # single language
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const config = require('../config/pairs.json');

const DICT_DIR = path.resolve(__dirname, '..', config.defaults.dictionaryDir);
const FREQ_BASE = path.resolve(__dirname, '..', config.defaults.frequencyBase);
const OUT_DIR = path.join(DICT_DIR, 'normalized');

// CEFR assignment from frequency rank
const CEFR_LEVELS = {
  A1: { min: 1, max: 500,   difficulty: 1 },
  A2: { min: 501, max: 1500,  difficulty: 2 },
  B1: { min: 1501, max: 3000,  difficulty: 3 },
  B2: { min: 3001, max: 6000,  difficulty: 5 },
  C1: { min: 6001, max: 12000, difficulty: 7 },
  C2: { min: 12001, max: 30000, difficulty: 9 },
};

function assignCEFR(rank) {
  for (const [level, range] of Object.entries(CEFR_LEVELS)) {
    if (rank >= range.min && rank <= range.max) {
      return { level, difficulty: range.difficulty };
    }
  }
  return { level: 'C2', difficulty: 9 };
}

// Patterns for glosses that are grammatical descriptions, not translations
const GRAMMATICAL_PATTERNS = [
  /\b(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|partitive|comitative)\b/i,
  /\b(first|second|third)[\s-]person\b/i,
  /\b(singular|plural)\s+(of|form)\b/i,
  /\bpast[\s-](tense|participle)\s+of\b/i,
  /\bpresent[\s-](tense|participle)\s+of\b/i,
  /\b(inflection|conjugation|declension)\s+of\b/i,
  /\bform\s+of\b/i,
  /\balternative\s+form\s+of\b/i,
  /\b(comparative|superlative)\s+of\b/i,
  /\b(causative|frequentative|diminutive|augmentative|supine|gerund|participle)\s+of\b/i,
  /\bcontraction\s+of\b/i,
  /\b(masculine|feminine|neuter)\b/i,
  /\b(initialism|abbreviation|acronym)\s+of\b/i,
  /\bletter\b.*\balphabet\b/i,
];

function isGrammaticalGloss(text) {
  if (!text) return true;
  if (text.length > 80) return true;
  return GRAMMATICAL_PATTERNS.some((p) => p.test(text));
}

// ---------------------------------------------------------------------------
// Read FrequencyWords
// ---------------------------------------------------------------------------

function readFrequencyWords(langCode, limit = 30000) {
  const meta = config.languages[langCode];
  if (!meta || !meta.frequencyFile) return new Map();

  const freqPath = path.join(FREQ_BASE, meta.frequencyFile);
  if (!fs.existsSync(freqPath)) {
    console.log(`  [warn] Frequency file missing for ${langCode}: ${freqPath}`);
    return new Map();
  }

  const content = fs.readFileSync(freqPath, 'utf-8');
  const lines = content.trim().split('\n');
  const words = new Map();

  for (let i = 0; i < Math.min(lines.length, limit); i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts[0]) {
      words.set(parts[0].toLowerCase(), {
        word: parts[0],
        frequency: parseInt(parts[1]) || 0,
        rank: i + 1,
      });
    }
  }

  return words;
}

// ---------------------------------------------------------------------------
// Parse Kaikki JSONL
// ---------------------------------------------------------------------------

function extractEnglishGlosses(entry) {
  const glosses = new Set();
  if (!entry.senses) return [];

  for (const sense of entry.senses) {
    if (sense.glosses) {
      for (const g of sense.glosses) {
        if (typeof g !== 'string') continue;
        const parts = g
          .replace(/\(.*?\)/g, '')
          .replace(/\[.*?\]/g, '')
          .split(/[;,]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0 && t.length < 50 && !isGrammaticalGloss(t));
        parts.forEach((t) => glosses.add(t));
      }
    }
  }
  return [...glosses];
}

function extractCrossTranslations(entry) {
  const map = {};
  if (!entry.translations) return map;

  for (const t of entry.translations) {
    const code = t.code || t.lang_code;
    if (!code || !t.word) continue;
    if (!config.languages[code]) continue;
    if (!map[code]) map[code] = [];
    if (!map[code].includes(t.word)) map[code].push(t.word);
  }
  return map;
}

function extractIPA(entry) {
  if (!entry.sounds) return null;
  for (const s of entry.sounds) {
    if (s.ipa) return s.ipa;
  }
  return null;
}

async function parseKaikkiFile(langCode) {
  const meta = config.languages[langCode];
  if (!meta || !meta.kaikkiSlug) return new Map();

  const filePath = path.join(DICT_DIR, `${meta.kaikkiSlug.toLowerCase()}.jsonl`);
  if (!fs.existsSync(filePath)) {
    console.log(`  [warn] Kaikki file missing: ${filePath}`);
    return new Map();
  }

  console.log(`  Parsing ${filePath} ...`);

  const dictionary = new Map();
  let lineCount = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 100000 === 0) {
      process.stdout.write(`\r  ${lineCount.toLocaleString()} entries ...`);
    }

    try {
      const entry = JSON.parse(line);
      if (!entry.word) continue;

      const word = entry.word.toLowerCase();
      const glosses = extractEnglishGlosses(entry);
      const cross = extractCrossTranslations(entry);
      const ipa = extractIPA(entry);

      if (glosses.length === 0 && Object.keys(cross).length === 0) continue;

      const existing = dictionary.get(word);
      if (existing) {
        // Merge: add new glosses and cross-translations
        for (const g of glosses) {
          if (!existing.glosses.includes(g)) existing.glosses.push(g);
        }
        for (const [code, words] of Object.entries(cross)) {
          if (!existing.cross[code]) existing.cross[code] = [];
          for (const w of words) {
            if (!existing.cross[code].includes(w)) existing.cross[code].push(w);
          }
        }
        if (!existing.ipa && ipa) existing.ipa = ipa;
      } else {
        dictionary.set(word, {
          word: entry.word,
          pos: entry.pos || 'unknown',
          glosses,
          cross,
          ipa,
        });
      }
    } catch {
      // skip malformed lines
    }
  }

  console.log(`\r  ${lineCount.toLocaleString()} entries, ${dictionary.size.toLocaleString()} unique words`);
  return dictionary;
}

// ---------------------------------------------------------------------------
// Build normalized output for one language
// ---------------------------------------------------------------------------

async function normalizeLanguage(langCode) {
  const meta = config.languages[langCode];
  console.log(`\n--- Normalizing ${meta.name} (${langCode}) ---\n`);

  // 1. Read frequency words
  const frequency = readFrequencyWords(langCode);
  console.log(`  Frequency words loaded: ${frequency.size.toLocaleString()}`);

  // 2. Parse Kaikki dictionary
  const dictionary = await parseKaikkiFile(langCode);

  // 3. Merge into normalized entries
  const entries = [];

  frequency.forEach((freqData, word) => {
    const { level, difficulty } = assignCEFR(freqData.rank);
    const dictEntry = dictionary.get(word);

    const entry = {
      headword: freqData.word,
      pos: dictEntry?.pos || 'unknown',
      frequency_rank: freqData.rank,
      cefr: level,
      difficulty,
      ipa: dictEntry?.ipa || null,
      english_glosses: dictEntry?.glosses?.slice(0, 3) || [],
      cross_translations: dictEntry?.cross || {},
      data_source: dictEntry ? 'kaikki' : 'frequency-only',
    };

    entries.push(entry);
  });

  // Also add Kaikki words not in frequency list (assign high rank)
  let syntheticRank = frequency.size + 1;
  dictionary.forEach((dictEntry, word) => {
    if (frequency.has(word)) return;
    if (syntheticRank > config.defaults.wordLimit) return;

    const { level, difficulty } = assignCEFR(syntheticRank);

    entries.push({
      headword: dictEntry.word,
      pos: dictEntry.pos,
      frequency_rank: syntheticRank,
      cefr: level,
      difficulty,
      ipa: dictEntry.ipa,
      english_glosses: dictEntry.glosses?.slice(0, 3) || [],
      cross_translations: dictEntry.cross || {},
      data_source: 'kaikki-no-freq',
    });

    syntheticRank++;
  });

  // Sort by frequency rank
  entries.sort((a, b) => a.frequency_rank - b.frequency_rank);

  // Limit
  const limited = entries.slice(0, config.defaults.wordLimit);

  // Stats
  const withGlosses = limited.filter((e) => e.english_glosses.length > 0).length;
  const withCross = limited.filter((e) => Object.keys(e.cross_translations).length > 0).length;

  console.log(`  Total entries: ${limited.length.toLocaleString()}`);
  console.log(`  With English glosses: ${withGlosses.toLocaleString()}`);
  console.log(`  With cross-translations: ${withCross.toLocaleString()}`);

  // Write output
  const outPath = path.join(OUT_DIR, `${langCode}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ lang: langCode, generated: new Date().toISOString(), entries: limited }, null, 2));
  console.log(`  Saved: ${outPath}`);

  return limited;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  let targetLangs = null;
  for (const arg of args) {
    const [key, val] = arg.replace('--', '').split('=');
    if (key === 'lang') targetLangs = val.split(',');
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('\n=== Pipeline Stage 2: NORMALIZE ===');

  // Determine which languages need normalization
  const needed = new Set();
  for (const pair of config.pairs) {
    if (pair.source !== 'en') needed.add(pair.source);
    if (pair.target !== 'en') needed.add(pair.target);
  }

  const languages = targetLangs
    ? targetLangs.filter((l) => needed.has(l))
    : [...needed];

  for (const lang of languages) {
    await normalizeLanguage(lang);
  }

  console.log('\n=== Normalization complete ===\n');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
