#!/usr/bin/env node

/**
 * Pipeline Stage 6: EXPORT
 *
 * Reads normalized data from dictionaries/normalized/ and generates
 * the final JSON files consumed by the mobile app and backend:
 *
 *   mobile/src/data/words_{source}_{target}.json
 *
 * For English-based pairs the English glosses from the normalized
 * file are used directly.  For cross-language pairs (e.g. fr-de)
 * the cross_translations map is used first; if missing, the English
 * bridge strategy is applied as a fallback.
 *
 * Both directions (source->target and target->source) are generated
 * from a single config entry.
 *
 * Usage:
 *   node pipeline/export.js                         # all pairs
 *   node pipeline/export.js --pair=fr-de            # single pair
 *   node pipeline/export.js --tier=1                # tier 1 only
 */

const fs = require('fs');
const path = require('path');

const config = require('../config/pairs.json');

const NORM_DIR = path.resolve(__dirname, '..', config.defaults.dictionaryDir, 'normalized');
const DATA_DIR = path.resolve(__dirname, '..', '..', 'src', 'data');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadNormalized(langCode) {
  const filePath = path.join(NORM_DIR, `${langCode}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { pair: null, tier: null };
  for (const arg of args) {
    const [key, val] = arg.replace('--', '').split('=');
    if (key === 'pair') opts.pair = val;
    if (key === 'tier') opts.tier = parseInt(val);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// English-based pair export (en-X)
// ---------------------------------------------------------------------------

function exportEnglishPair(targetLang, normalizedData) {
  const words = [];
  const missing = [];

  for (const entry of normalizedData.entries) {
    const translation = entry.english_glosses.length > 0
      ? entry.english_glosses.slice(0, 2).join('/')
      : null;

    words.push({
      id: `${targetLang}_${entry.frequency_rank}`,
      source_word: translation || `[NEED:${entry.headword}]`,
      target_word: entry.headword,
      difficulty: entry.difficulty,
      category: 'general',
      frequency_rank: entry.frequency_rank,
      cefr_level: entry.cefr,
      source_lang: 'en',
      target_lang: targetLang,
      data_source: translation ? entry.data_source : 'missing',
      ipa: entry.ipa || null,
    });

    if (!translation) missing.push(entry.headword);
  }

  return { words, missing };
}

// ---------------------------------------------------------------------------
// Cross-language pair export (X-Y, neither is English)
// ---------------------------------------------------------------------------

function exportCrossLanguagePair(sourceLang, targetLang, sourceData, targetData) {
  const words = [];
  const missing = [];

  // Build an index of target-language words by their English glosses (for bridge fallback)
  const englishToTarget = new Map();
  if (targetData) {
    for (const entry of targetData.entries) {
      for (const gloss of entry.english_glosses) {
        const key = gloss.toLowerCase();
        if (!englishToTarget.has(key)) {
          englishToTarget.set(key, entry.headword);
        }
      }
    }
  }

  for (const entry of sourceData.entries) {
    // Strategy 1: direct cross-translation from Kaikki
    let translation = null;
    let source = 'kaikki-cross';

    const crossList = entry.cross_translations[targetLang];
    if (crossList && crossList.length > 0) {
      translation = crossList[0];
    }

    // Strategy 2: English bridge fallback
    if (!translation && entry.english_glosses.length > 0) {
      for (const gloss of entry.english_glosses) {
        const bridged = englishToTarget.get(gloss.toLowerCase());
        if (bridged) {
          translation = bridged;
          source = 'bridge';
          break;
        }
      }
    }

    words.push({
      id: `${sourceLang}_${targetLang}_${entry.frequency_rank}`,
      source_word: entry.headword,
      target_word: translation || `[NEED:${entry.headword}]`,
      difficulty: entry.difficulty,
      category: 'general',
      frequency_rank: entry.frequency_rank,
      cefr_level: entry.cefr,
      source_lang: sourceLang,
      target_lang: targetLang,
      data_source: translation ? source : 'missing',
      ipa: entry.ipa || null,
    });

    if (!translation) missing.push(entry.headword);
  }

  return { words, missing };
}

// ---------------------------------------------------------------------------
// Write JSON file
// ---------------------------------------------------------------------------

function writeWordsFile(source, target, words) {
  const fileName = `words_${source}_${target}.json`;
  const filePath = path.join(DATA_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2));

  const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
  console.log(`  -> ${fileName} (${words.length.toLocaleString()} words, ${sizeMB} MB)`);
}

// ---------------------------------------------------------------------------
// Process one pair (bidirectional)
// ---------------------------------------------------------------------------

function processPair(pairConfig, normalizedCache) {
  const { source, target, tier } = pairConfig;
  const sourceMeta = config.languages[source];
  const targetMeta = config.languages[target];

  console.log(`\n  ${sourceMeta.name} <-> ${targetMeta.name}  [tier ${tier}]`);

  // Load normalized data
  if (source !== 'en' && !normalizedCache[source]) {
    normalizedCache[source] = loadNormalized(source);
  }
  if (target !== 'en' && !normalizedCache[target]) {
    normalizedCache[target] = loadNormalized(target);
  }

  if (source === 'en') {
    // English -> target
    const targetData = normalizedCache[target];
    if (!targetData) {
      console.log(`    [skip] No normalized data for ${target}`);
      return;
    }

    const { words, missing } = exportEnglishPair(target, targetData);
    const matched = words.length - missing.length;
    console.log(`    en->${target}: ${matched}/${words.length} translated (${((matched / words.length) * 100).toFixed(1)}%)`);

    writeWordsFile('en', target, words);

    // Reverse: target -> English
    const reversed = words.map((w) => ({
      ...w,
      id: `${target}_en_${w.frequency_rank}`,
      source_word: w.target_word,
      target_word: w.source_word,
      source_lang: target,
      target_lang: 'en',
    }));
    writeWordsFile(target, 'en', reversed);
  } else {
    // Cross-language pair
    const sourceData = normalizedCache[source];
    const targetData = normalizedCache[target];

    if (!sourceData) {
      console.log(`    [skip] No normalized data for ${source}`);
      return;
    }

    // source -> target
    const fwd = exportCrossLanguagePair(source, target, sourceData, targetData);
    const fwdMatched = fwd.words.length - fwd.missing.length;
    console.log(`    ${source}->${target}: ${fwdMatched}/${fwd.words.length} translated (${((fwdMatched / fwd.words.length) * 100).toFixed(1)}%)`);
    writeWordsFile(source, target, fwd.words);

    // target -> source (reverse)
    if (targetData) {
      const rev = exportCrossLanguagePair(target, source, targetData, sourceData);
      const revMatched = rev.words.length - rev.missing.length;
      console.log(`    ${target}->${source}: ${revMatched}/${rev.words.length} translated (${((revMatched / rev.words.length) * 100).toFixed(1)}%)`);
      writeWordsFile(target, source, rev.words);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const opts = parseArgs();

  console.log('\n=== Pipeline Stage 6: EXPORT ===');

  if (!fs.existsSync(NORM_DIR)) {
    console.error(`\nNormalized data directory not found: ${NORM_DIR}`);
    console.error('Run `node pipeline/normalize.js` first.\n');
    process.exit(1);
  }

  const normalizedCache = {};

  let pairs = config.pairs;
  if (opts.pair) {
    const [s, t] = opts.pair.split('-');
    pairs = pairs.filter((p) => (p.source === s && p.target === t) || (p.source === t && p.target === s));
  }
  if (opts.tier !== null) {
    pairs = pairs.filter((p) => p.tier === opts.tier);
  }

  console.log(`\nExporting ${pairs.length} pair(s)...\n`);

  for (const pair of pairs) {
    processPair(pair, normalizedCache);
  }

  // Summary
  console.log('\n--- Coverage Summary ---\n');

  const dataFiles = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith('words_') && f.endsWith('.json'));
  for (const file of dataFiles.sort()) {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
    const total = data.length;
    const needCount = data.filter((w) => w.source_word?.startsWith('[NEED:') || w.target_word?.startsWith('[NEED:')).length;
    const pct = total > 0 ? (((total - needCount) / total) * 100).toFixed(1) : '0.0';
    console.log(`  ${file}: ${total.toLocaleString()} words, ${pct}% translated`);
  }

  console.log('\n=== Export complete ===\n');
}

main();
