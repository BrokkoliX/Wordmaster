/**
 * Quick Import Script - Get 30K words into database for testing
 * This will:
 * 1. Parse Wiktionary data for English translations
 * 2. Import words into SQLite database
 * 3. Make it ready for app testing
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load our 30K Spanish words
const wordsFile = path.join(__dirname, '..', 'src', 'data', 'words_30k_spanish.json');
const spanishWords = JSON.parse(fs.readFileSync(wordsFile, 'utf-8'));

console.log(`📚 Loaded ${spanishWords.length.toLocaleString()} Spanish words`);

// Parse Wiktionary JSONL file for translations
async function parseWiktionaryTranslations() {
  console.log('🔍 Parsing Wiktionary data for English translations...');
  
  const wiktFile = path.join(__dirname, '../../data/kaikki/Spanish.jsonl');
  
  if (!fs.existsSync(wiktFile)) {
    console.log('⚠️  Wiktionary file not found. Using sample translations.');
    return {};
  }
  
  const translations = {};
  let lineCount = 0;
  let translationCount = 0;
  
  const fileStream = fs.createReadStream(wiktFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    lineCount++;
    if (lineCount % 10000 === 0) {
      process.stdout.write(`\r  Processed ${lineCount.toLocaleString()} entries, found ${translationCount.toLocaleString()} translations`);
    }
    
    try {
      const entry = JSON.parse(line);
      const spanishWord = entry.word;
      
      // Look for English translations
      if (entry.translations) {
        for (const trans of entry.translations) {
          if (trans.lang_code === 'en' || trans.lang === 'Inglés') {
            if (!translations[spanishWord]) {
              translations[spanishWord] = [];
            }
            translations[spanishWord].push(trans.word);
            translationCount++;
          }
        }
      }
    } catch (e) {
      // Skip malformed lines
    }
  }
  
  console.log(`\n✅ Found translations for ${Object.keys(translations).length.toLocaleString()} Spanish words`);
  return translations;
}

// Add translations to our words
async function addTranslations() {
  console.log('\n📖 Adding English translations to words...');
  
  const translations = await parseWiktionaryTranslations();
  
  let translatedCount = 0;
  let needTranslationCount = 0;
  
  for (const word of spanishWords) {
    const spanishWord = word.target_word;
    
    // Check if we found a translation in Wiktionary
    if (translations[spanishWord] && translations[spanishWord].length > 0) {
      // Use the first (most common) translation
      word.source_word = translations[spanishWord][0];
      word.needs_translation = false;
      translatedCount++;
    } else {
      // Mark as needing translation
      needTranslationCount++;
    }
  }
  
  console.log(`✅ Translated: ${translatedCount.toLocaleString()} words`);
  console.log(`⏳ Still need: ${needTranslationCount.toLocaleString()} words`);
  
  // Save updated file
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'words_30k_translated.json');
  fs.writeFileSync(outputPath, JSON.stringify(spanishWords, null, 2));
  console.log(`💾 Saved to: words_30k_translated.json`);
  
  return spanishWords;
}

// Import to SQLite database
async function importToDatabase(words) {
  console.log('\n🗄️  Importing to SQLite database...');
  
  const sqlite3 = require('better-sqlite3');
  const dbPath = path.join(__dirname, '..', 'wordmaster_test.db');
  
  // Remove old database if exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️  Removed old database');
  }
  
  const db = new sqlite3(dbPath);
  
  // Create tables
  console.log('📋 Creating tables...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
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
    
    CREATE TABLE IF NOT EXISTS user_word_progress (
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
    
    CREATE INDEX idx_words_difficulty ON words(difficulty);
    CREATE INDEX idx_words_category ON words(category);
    CREATE INDEX idx_words_frequency ON words(frequency_rank);
    CREATE INDEX idx_words_cefr ON words(cefr_level);
    CREATE INDEX idx_progress_next_review ON user_word_progress(next_review_date);
  `);
  
  console.log('✅ Tables created');
  
  // Import words in batches
  console.log('📥 Importing words...');
  const insert = db.prepare(`
    INSERT INTO words (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((words) => {
    for (const word of words) {
      insert.run(
        word.id,
        word.source_word || `[${word.target_word}]`, // English or placeholder
        word.target_word,                             // Spanish
        word.difficulty,
        word.category,
        word.frequency_rank,
        word.cefr_level,
        'en',
        'es'
      );
    }
  });
  
  insertMany(words);
  
  // Get statistics
  const stats = db.prepare('SELECT COUNT(*) as count FROM words').get();
  console.log(`✅ Imported ${stats.count.toLocaleString()} words to database`);
  
  // Count by CEFR level
  console.log('\n📊 Words by CEFR Level:');
  const cefrStats = db.prepare(`
    SELECT cefr_level, COUNT(*) as count 
    FROM words 
    GROUP BY cefr_level 
    ORDER BY cefr_level
  `).all();
  
  cefrStats.forEach(row => {
    console.log(`   ${row.cefr_level}: ${row.count.toLocaleString()} words`);
  });
  
  // Sample some words
  console.log('\n📝 Sample words from database:');
  const samples = db.prepare(`
    SELECT word, translation, cefr_level, frequency_rank 
    FROM words 
    WHERE word NOT LIKE '[%'
    ORDER BY frequency_rank 
    LIMIT 10
  `).all();
  
  samples.forEach((row, i) => {
    console.log(`   ${i + 1}. ${row.translation} = ${row.word} (${row.cefr_level}, rank: ${row.frequency_rank})`);
  });
  
  db.close();
  console.log(`\n💾 Database saved to: ${dbPath}`);
  
  return dbPath;
}

// Main execution
async function main() {
  console.log('🚀 Quick Import to Database\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Add translations
    const translatedWords = await addTranslations();
    
    // Step 2: Import to database
    const dbPath = await importToDatabase(translatedWords);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ IMPORT COMPLETE!');
    console.log('\n📱 Ready to test in app!');
    console.log('\nNext steps:');
    console.log('1. Copy the database to your app');
    console.log('2. Update app to use new database');
    console.log('3. Test in simulator!');
    console.log('\n🎉 You now have 30,000 words ready to use!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Check if better-sqlite3 is installed
try {
  require.resolve('better-sqlite3');
  main();
} catch (e) {
  console.log('📦 Installing better-sqlite3...');
  console.log('Run: npm install better-sqlite3');
  console.log('Then run this script again.');
  process.exit(1);
}
