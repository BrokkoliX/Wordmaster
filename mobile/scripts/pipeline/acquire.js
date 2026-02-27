#!/usr/bin/env node

/**
 * Pipeline Stage 1: ACQUIRE
 *
 * Downloads raw dictionary data from Kaikki.org and ensures
 * FrequencyWords files are present.  Idempotent -- skips files
 * that already exist.
 *
 * Usage:
 *   node pipeline/acquire.js                    # download all
 *   node pipeline/acquire.js --lang=fr          # single language
 *   node pipeline/acquire.js --lang=fr,de       # specific languages
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = require('../config/pairs.json');

const DICT_DIR = path.resolve(__dirname, '..', config.defaults.dictionaryDir);
const FREQ_BASE = path.resolve(__dirname, '..', config.defaults.frequencyBase);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest) {
  if (fs.existsSync(dest)) {
    console.log(`  [skip] ${path.basename(dest)} already exists`);
    return;
  }
  console.log(`  [download] ${url}`);
  console.log(`         --> ${dest}`);
  execSync(`curl -L "${url}" -o "${dest}" --progress-bar`, { stdio: 'inherit' });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { langs: null };
  for (const arg of args) {
    const [key, val] = arg.replace('--', '').split('=');
    if (key === 'lang') opts.langs = val.split(',');
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const opts = parseArgs();
  ensureDir(DICT_DIR);

  console.log('\n=== Pipeline Stage 1: ACQUIRE ===\n');

  // Determine which languages we need dictionaries for
  const needed = new Set();
  for (const pair of config.pairs) {
    if (pair.source !== 'en') needed.add(pair.source);
    if (pair.target !== 'en') needed.add(pair.target);
  }

  const languages = opts.langs
    ? opts.langs.filter((l) => needed.has(l))
    : [...needed];

  // 1. Download Kaikki.org JSONL dictionaries
  console.log('--- Kaikki.org Wiktionary JSONL dictionaries ---\n');

  for (const lang of languages) {
    const meta = config.languages[lang];
    if (!meta || !meta.kaikkiSlug) {
      console.log(`  [skip] No Kaikki slug for "${lang}"`);
      continue;
    }

    const url = `${config.defaults.kaikkiBase}/${meta.kaikkiSlug}/kaikki.org-dictionary-${meta.kaikkiSlug}.jsonl`;
    const dest = path.join(DICT_DIR, `${meta.kaikkiSlug.toLowerCase()}.jsonl`);
    download(url, dest);
  }

  // 2. Verify FrequencyWords files
  console.log('\n--- FrequencyWords verification ---\n');

  let missingFreq = false;
  for (const lang of languages) {
    const meta = config.languages[lang];
    if (!meta || !meta.frequencyFile) continue;

    const freqPath = path.join(FREQ_BASE, meta.frequencyFile);
    if (fs.existsSync(freqPath)) {
      console.log(`  [ok]   ${meta.frequencyFile}`);
    } else {
      console.log(`  [MISS] ${meta.frequencyFile}`);
      missingFreq = true;
    }
  }

  if (missingFreq) {
    console.log('\n  FrequencyWords files are missing.');
    console.log('  The data/content directory should contain OpenSubtitles frequency lists.');
    console.log('  See: https://github.com/hermitdave/FrequencyWords');
  }

  console.log('\n=== Acquisition complete ===\n');
}

main();
