/**
 * Export all languages from database to JSON files
 * This creates the JSON files that the app imports on first launch
 */

const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'wordmaster.db');
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

const LANGUAGE_PAIRS = [
  { source: 'en', target: 'es', name: 'Spanish', file: 'words_translated.json' },
  { source: 'en', target: 'fr', name: 'French', file: 'words_french.json' },
  { source: 'en', target: 'de', name: 'German', file: 'words_german.json' },
  { source: 'en', target: 'hu', name: 'Hungarian', file: 'words_hungarian.json' },
  { source: 'es', target: 'en', name: 'Spanish→English', file: 'words_spanish_to_english.json' },
  { source: 'fr', target: 'en', name: 'French→English', file: 'words_french_to_english.json' },
  { source: 'de', target: 'en', name: 'German→English', file: 'words_german_to_english.json' },
  { source: 'hu', target: 'en', name: 'Hungarian→English', file: 'words_hungarian_to_english.json' },
];

function exportLanguagePair(db, sourceLang, targetLang, outputFile) {
  console.log(`\nExporting ${sourceLang} → ${targetLang}...`);
  
  const words = db.prepare(`
    SELECT id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang
    FROM words
    WHERE source_lang = ? AND target_lang = ?
    ORDER BY frequency_rank ASC
  `).all(sourceLang, targetLang);
  
  if (words.length === 0) {
    console.log(`  ⚠️  No words found, skipping`);
    return 0;
  }
  
  // Transform to match the import format
  const formatted = words.map(w => ({
    id: w.id,
    source_word: w.translation,  // English translation
    target_word: w.word,         // Target language word
    difficulty: w.difficulty,
    category: w.category,
    frequency_rank: w.frequency_rank,
    cefr_level: w.cefr_level,
    source_lang: w.source_lang,
    target_lang: w.target_lang
  }));
  
  const outputPath = path.join(DATA_DIR, outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(formatted, null, 2), 'utf-8');
  
  const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
  console.log(`  ✅ Exported ${words.length.toLocaleString()} words to ${outputFile} (${fileSizeMB} MB)`);
  
  return words.length;
}

async function main() {
  console.log('📤 Exporting all languages from database to JSON\n');
  console.log(`Database: ${DB_PATH}`);
  console.log(`Output directory: ${DATA_DIR}\n`);
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found!');
    process.exit(1);
  }
  
  const db = new sqlite3(DB_PATH);
  
  // Check total words
  const total = db.prepare('SELECT COUNT(*) as count FROM words').get();
  console.log(`Total words in database: ${total.count.toLocaleString()}\n`);
  
  let totalExported = 0;
  
  // Export each language pair
  for (const pair of LANGUAGE_PAIRS) {
    const count = exportLanguagePair(db, pair.source, pair.target, pair.file);
    totalExported += count;
  }
  
  db.close();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ EXPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total words exported: ${totalExported.toLocaleString()}`);
  console.log(`\nJSON files created in: ${DATA_DIR}`);
  console.log('\n🎯 App is now ready to import all languages on first launch!');
}

main().catch(console.error);
