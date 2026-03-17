/**
 * Extract A1-level words from all language pair JSON files into a single
 * compact starter_words.json for first-launch offline fallback.
 *
 * Usage:  node scripts/generateStarterWords.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../src/data');

const PAIRS = [
  { file: 'words_translated.json',            key: 'en_es' },
  { file: 'words_spanish_to_english.json',    key: 'es_en' },
  { file: 'words_french.json',                key: 'en_fr' },
  { file: 'words_french_to_english.json',     key: 'fr_en' },
  { file: 'words_german.json',                key: 'en_de' },
  { file: 'words_german_to_english.json',     key: 'de_en' },
  { file: 'words_hungarian.json',             key: 'en_hu' },
  { file: 'words_hungarian_to_english.json',  key: 'hu_en' },
  { file: 'words_portuguese.json',            key: 'en_pt' },
  { file: 'words_portuguese_to_english.json', key: 'pt_en' },
  { file: 'words_russian.json',               key: 'en_ru' },
  { file: 'words_russian_to_english.json',    key: 'ru_en' },
  { file: 'words_italian.json',               key: 'en_it' },
  { file: 'words_italian_to_english.json',    key: 'it_en' },
  { file: 'words_polish.json',                key: 'en_pl' },
  { file: 'words_polish_to_english.json',     key: 'pl_en' },
];

const starter = {};
let totalWords = 0;

for (const { file, key } of PAIRS) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) {
    console.log(`  [skip] ${file} -- not found`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const a1 = data.filter(w => w.cefr_level === 'A1');
  starter[key] = a1;
  totalWords += a1.length;
  console.log(`  ${key}: ${a1.length} A1 words`);
}

const outPath = path.join(DATA_DIR, 'starter_words.json');
fs.writeFileSync(outPath, JSON.stringify(starter), 'utf-8');

const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`\nWrote ${outPath}`);
console.log(`Total: ${totalWords} words, ${sizeKB} KB`);
