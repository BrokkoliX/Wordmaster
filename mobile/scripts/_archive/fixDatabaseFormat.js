/**
 * Fix database format to match app expectations
 * App expects: word = English, translation = Spanish
 * We have: word = English, translation = Spanish
 * Need to swap them!
 */

const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wordmaster.db');
const db = new sqlite3(dbPath);

console.log('🔧 Fixing database format...\n');

// Check current format
const sample = db.prepare('SELECT * FROM words LIMIT 1').get();
console.log('Current format:');
console.log(`  word: ${sample.word}`);
console.log(`  translation: ${sample.translation}`);
console.log(`  source_lang: ${sample.source_lang}`);
console.log(`  target_lang: ${sample.target_lang}`);

// The app expects:
// - word = Spanish (what we're learning)
// - translation = English (what we know)

// Our database has:
// - word = English
// - translation = Spanish

console.log('\n🔄 Swapping word and translation columns...');

// Create temporary column
db.exec(`
  ALTER TABLE words ADD COLUMN temp_word TEXT;
`);

// Swap the values
db.exec(`
  UPDATE words SET temp_word = word;
  UPDATE words SET word = translation;
  UPDATE words SET translation = temp_word;
`);

// Remove temp column (SQLite doesn't support DROP COLUMN easily)
// So we'll create a new table with correct structure
db.exec(`
  CREATE TABLE words_new (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1,
    category TEXT,
    frequency_rank INTEGER,
    cefr_level TEXT,
    source_lang TEXT DEFAULT 'es',
    target_lang TEXT DEFAULT 'en'
  );
`);

// Copy swapped data
db.exec(`
  INSERT INTO words_new 
  SELECT id, translation, word, difficulty, category, frequency_rank, cefr_level, target_lang, source_lang
  FROM words;
`);

// Drop old table and rename new one
db.exec(`
  DROP TABLE words;
  ALTER TABLE words_new RENAME TO words;
`);

// Recreate indexes
db.exec(`
  CREATE INDEX idx_words_difficulty ON words(difficulty);
  CREATE INDEX idx_words_category ON words(category);
  CREATE INDEX idx_words_frequency ON words(frequency_rank);
  CREATE INDEX idx_words_cefr ON words(cefr_level);
`);

// Verify the fix
const fixed = db.prepare('SELECT * FROM words LIMIT 5').all();
console.log('\n✅ Fixed! New format:');
fixed.forEach((row, i) => {
  console.log(`  ${i+1}. ${row.word} = ${row.translation} (${row.cefr_level})`);
});

console.log('\n📊 Summary:');
const count = db.prepare('SELECT COUNT(*) as count FROM words').get();
console.log(`  Total words: ${count.count.toLocaleString()}`);

const a1Count = db.prepare('SELECT COUNT(*) as count FROM words WHERE cefr_level = ?').get('A1');
console.log(`  A1 words: ${a1Count.count}`);

db.close();

console.log('\n🎉 Database fixed and ready to use!');
console.log('Now the app should show Spanish words to learn with English translations.');
