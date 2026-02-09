/**
 * Create database with CORRECT column mapping
 * word = Spanish (what we're learning)
 * translation = English (what we know)
 */

const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wordmaster.db');
const jsonPath = path.join(__dirname, '..', 'src', 'data', 'words_30k_spanish.json');

// Delete old database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️  Deleted old database');
}

const db = new sqlite3(dbPath);

console.log('📦 Creating new database...\n');

// Create tables
db.exec(`
  CREATE TABLE words (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1,
    category TEXT,
    frequency_rank INTEGER,
    cefr_level TEXT,
    source_lang TEXT DEFAULT 'en',
    target_lang TEXT DEFAULT 'es'
  );
  
  CREATE TABLE user_word_progress (
    id TEXT PRIMARY KEY,
    word_id TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    confidence_level INTEGER DEFAULT 0,
    times_shown INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    times_incorrect INTEGER DEFAULT 0,
    consecutive_correct INTEGER DEFAULT 0,
    ease_factor REAL DEFAULT 2.5,
    interval_days INTEGER DEFAULT 0,
    next_review_date TEXT DEFAULT (date('now')),
    last_reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (word_id) REFERENCES words(id)
  );
  
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    words_reviewed INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    accuracy REAL,
    new_words_introduced INTEGER DEFAULT 0
  );
  
  CREATE TABLE user_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  
  CREATE TABLE user_statistics (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_activity_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  
  CREATE INDEX idx_words_difficulty ON words(difficulty);
  CREATE INDEX idx_words_category ON words(category);
  CREATE INDEX idx_words_frequency ON words(frequency_rank);
  CREATE INDEX idx_words_cefr ON words(cefr_level);
  CREATE INDEX idx_progress_next_review ON user_word_progress(next_review_date);
`);

console.log('✅ Tables created');

// Load JSON data
console.log('📥 Loading word data...');
const wordsData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
console.log(`   Found ${wordsData.length.toLocaleString()} words`);

// Prepare insert statement
const insert = db.prepare(`
  INSERT INTO words (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Import with CORRECT mapping
console.log('💾 Importing words with correct mapping...');
console.log('   word = Spanish (target_word)');
console.log('   translation = English (source_word)\n');

const importMany = db.transaction((words) => {
  let skipped = 0;
  for (const w of words) {
    // Skip words without English translation
    if (!w.source_word || w.source_word.trim() === '') {
      skipped++;
      continue;
    }
    
    insert.run(
      w.id,
      w.target_word,      // Spanish → word column
      w.source_word,      // English → translation column
      w.difficulty,
      w.category,
      w.frequency_rank,
      w.cefr_level,
      'en',              // source_lang = English
      'es'               // target_lang = Spanish
    );
  }
  if (skipped > 0) {
    console.log(`   ⚠️  Skipped ${skipped} words without translations`);
  }
});

importMany(wordsData);

// Verify
const count = db.prepare('SELECT COUNT(*) as count FROM words').get();
console.log(`✅ Imported ${count.count.toLocaleString()} words`);

// Show sample
console.log('\n📝 Sample words (first 10):');
const samples = db.prepare(`
  SELECT word, translation, cefr_level
  FROM words
  ORDER BY frequency_rank
  LIMIT 10
`).all();

samples.forEach((row, i) => {
  console.log(`  ${i + 1}. ${row.word} → ${row.translation} (${row.cefr_level})`);
});

// CEFR breakdown
console.log('\n📊 Words by CEFR level:');
const stats = db.prepare(`
  SELECT cefr_level, COUNT(*) as count
  FROM words
  GROUP BY cefr_level
  ORDER BY cefr_level
`).all();

stats.forEach(s => {
  console.log(`   ${s.cefr_level}: ${s.count.toLocaleString()} words`);
});

db.close();

console.log('\n🎉 Database created successfully!');
console.log('📱 Ready to use in the app!');
