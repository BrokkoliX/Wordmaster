#!/usr/bin/env node

/**
 * Pipeline Stage 4: VALIDATE
 *
 * Scans exported words_*.json files for common data quality issues
 * and prints a coverage report.  Does not modify any files.
 *
 * Usage:
 *   node pipeline/validate.js                   # all files
 *   node pipeline/validate.js --pair=fr-de      # single pair
 */

const fs = require('fs');
const path = require('path');

const config = require('../config/pairs.json');

const DATA_DIR = path.resolve(__dirname, '..', '..', 'src', 'data');

const LATIN_RE = /^[\u0000-\u024F\u1E00-\u1EFF\u2C60-\u2C7F\uA720-\uA7FF\s\-'.]+$/;
const CYRILLIC_RE = /^[\u0400-\u04FF\u0500-\u052F\s\-'.]+$/;

const SCRIPT_MAP = {
  en: LATIN_RE,
  es: LATIN_RE,
  fr: LATIN_RE,
  de: LATIN_RE,
  hu: LATIN_RE,
  pt: LATIN_RE,
  ru: CYRILLIC_RE,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { pair: null };
  for (const arg of args) {
    const [key, val] = arg.replace('--', '').split('=');
    if (key === 'pair') opts.pair = val;
  }
  return opts;
}

function validateFile(filePath) {
  const fileName = path.basename(filePath);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (!Array.isArray(data) || data.length === 0) {
    console.log(`  [EMPTY] ${fileName}`);
    return null;
  }

  const sourceLang = data[0].source_lang;
  const targetLang = data[0].target_lang;
  const sourceScript = SCRIPT_MAP[sourceLang];
  const targetScript = SCRIPT_MAP[targetLang];

  const issues = {
    selfReferential: [],
    lengthRatio: [],
    scriptMismatch: [],
    duplicateHeadword: [],
    missing: [],
  };

  const cefrCounts = {};
  const sourceCounts = {};
  const headwordsSeen = new Set();

  for (const entry of data) {
    // CEFR counting
    cefrCounts[entry.cefr_level] = (cefrCounts[entry.cefr_level] || 0) + 1;

    // Data source counting
    const ds = entry.data_source || 'unknown';
    sourceCounts[ds] = (sourceCounts[ds] || 0) + 1;

    // Missing translation
    const sw = entry.source_word || '';
    const tw = entry.target_word || '';
    if (sw.startsWith('[NEED:') || tw.startsWith('[NEED:')) {
      issues.missing.push(entry.id);
      continue;
    }

    // Self-referential
    if (sw.toLowerCase() === tw.toLowerCase()) {
      issues.selfReferential.push(`${entry.id}: "${sw}"`);
    }

    // Length ratio (flag if one side is >5x longer by word count)
    const swWords = sw.split(/\s+/).length;
    const twWords = tw.split(/\s+/).length;
    if (swWords > 0 && twWords > 0) {
      const ratio = Math.max(swWords, twWords) / Math.min(swWords, twWords);
      if (ratio > 5) {
        issues.lengthRatio.push(`${entry.id}: "${sw}" (${swWords}w) vs "${tw}" (${twWords}w)`);
      }
    }

    // Script mismatch
    if (sourceScript && sw.length > 0 && !sourceScript.test(sw)) {
      issues.scriptMismatch.push(`${entry.id} source: "${sw}"`);
    }
    if (targetScript && tw.length > 0 && !targetScript.test(tw)) {
      issues.scriptMismatch.push(`${entry.id} target: "${tw}"`);
    }

    // Duplicate headword
    const headKey = `${sw.toLowerCase()}|${targetLang}`;
    if (headwordsSeen.has(headKey)) {
      issues.duplicateHeadword.push(`${entry.id}: "${sw}"`);
    }
    headwordsSeen.add(headKey);
  }

  // Report
  const total = data.length;
  const translated = total - issues.missing.length;
  const pct = ((translated / total) * 100).toFixed(1);

  console.log(`\n  ${fileName}  (${sourceLang} -> ${targetLang})`);
  console.log(`  Total: ${total.toLocaleString()}  |  Translated: ${translated.toLocaleString()} (${pct}%)`);

  console.log(`  CEFR: ${Object.entries(cefrCounts).sort().map(([k, v]) => `${k}:${v}`).join('  ')}`);
  console.log(`  Sources: ${Object.entries(sourceCounts).sort().map(([k, v]) => `${k}:${v}`).join('  ')}`);

  let hasIssues = false;
  for (const [type, list] of Object.entries(issues)) {
    if (type === 'missing') continue; // already reported as coverage
    if (list.length > 0) {
      hasIssues = true;
      console.log(`  [!] ${type}: ${list.length} issue(s)`);
      list.slice(0, 3).forEach((ex) => console.log(`       ${ex}`));
      if (list.length > 3) console.log(`       ... and ${list.length - 3} more`);
    }
  }

  if (!hasIssues && issues.missing.length === 0) {
    console.log('  [OK] No issues found');
  }

  return {
    file: fileName,
    source: sourceLang,
    target: targetLang,
    total,
    translated,
    coverage: parseFloat(pct),
    issues: {
      selfReferential: issues.selfReferential.length,
      lengthRatio: issues.lengthRatio.length,
      scriptMismatch: issues.scriptMismatch.length,
      duplicateHeadword: issues.duplicateHeadword.length,
      missing: issues.missing.length,
    },
  };
}

function main() {
  const opts = parseArgs();

  console.log('\n=== Pipeline Stage 4: VALIDATE ===');

  let files = fs.readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('words_') && f.endsWith('.json'))
    .sort();

  if (opts.pair) {
    const [s, t] = opts.pair.split('-');
    files = files.filter((f) => f.includes(`${s}_${t}`) || f.includes(`${t}_${s}`));
  }

  console.log(`\nScanning ${files.length} file(s) in ${DATA_DIR}\n`);

  const results = [];
  for (const file of files) {
    const r = validateFile(path.join(DATA_DIR, file));
    if (r) results.push(r);
  }

  // Summary table
  console.log('\n\n--- Summary ---\n');
  console.log('  Pair          Words      Coverage   Issues');
  console.log('  ' + '-'.repeat(55));

  for (const r of results) {
    const pair = `${r.source}->${r.target}`.padEnd(12);
    const words = r.total.toLocaleString().padStart(8);
    const cov = `${r.coverage}%`.padStart(8);
    const totalIssues = Object.values(r.issues).reduce((a, b) => a + b, 0) - r.issues.missing;
    const iss = totalIssues > 0 ? `${totalIssues} issues` : 'clean';
    console.log(`  ${pair}  ${words}    ${cov}   ${iss}`);
  }

  console.log('\n=== Validation complete ===\n');
}

main();
