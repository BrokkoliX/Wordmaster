/**
 * Import French, German, Hungarian to database
 * Simple frequency-based import with CEFR levels
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('better-sqlite3');

// CEFR thresholds
const CEFR_LEVELS = {
  A1: { min: 1, max: 500, difficulty: 1 },
  A2: { min: 501, max: 1500, difficulty: 2 },
  B1: { min: 1501, max: 3000, difficulty: 3 },
  B2: { min: 3001, max: 6000, difficulty: 5 },
  C1: { min: 6001, max: 12000, difficulty: 7 },
  C2: { min: 12001, max: 30000, difficulty: 9 }
};

// Language configs
const LANGUAGES = {
  fr: { name: 'French', flag: '🇫🇷', file: '../../FrequencyWords/content/2018/fr/fr_50k.txt' },
  de: { name: 'German', flag: '🇩🇪', file: '../../FrequencyWords/content/2018/de/de_50k.txt' },
  hu: { name: 'Hungarian', flag: '🇭🇺', file: '../../FrequencyWords/content/2018/hu/hu_50k.txt' }
};

function assignCEFR(rank) {
  for (const [level, range] of Object.entries(CEFR_LEVELS)) {
    if (rank >= range.min && rank <= range.max) {
      return { cefr: level, difficulty: range.difficulty };
    }
  }
  return { cefr: 'C2', difficulty: 10 };
}

function readFrequencyFile(filePath, limit = 30000) {
  const absolutePath = path.join(__dirname, filePath);
  console.log(`  Reading: ${absolutePath}`);
  
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  const words = [];
  for (let i = 0; i < Math.min(lines.length, limit); i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts[0]) {
      words.push({
        word: parts[0],
        frequency: parseInt(parts[1]) || 0,
        rank: i + 1
      });
    }
  }
  
  return words;
}

async function importLanguage(langCode) {
  const config = LANGUAGES[langCode];
  console.log(`\n${config.flag} Processing ${config.name}...`);
  
  // Read frequency data
  const words = readFrequencyFile(config.file, 30000);
  console.log(`  Loaded ${words.length.toLocaleString()} words`);
  
  // Process words
  const processed = words.map(w => {
    const { cefr, difficulty } = assignCEFR(w.rank);
    return {
      id: `${langCode}_${w.rank}`,
      word: w.word,
      translation: `[${langCode.toUpperCase()}] ${w.word}`, // Placeholder translation
      difficulty,
      category: 'general',
      frequency_rank: w.rank,
      cefr_level: cefr,
      source_lang: 'en',
      target_lang: langCode
    };
  });
  
  // CEFR breakdown
  const cefrCounts = {};
  processed.forEach(w => {
    cefrCounts[w.cefr_level] = (cefrCounts[w.cefr_level] || 0) + 1;
  });
  
  console.log(`  CEFR Distribution:`);
  Object.entries(cefrCounts).sort().forEach(([level, count]) => {
    console.log(`    ${level}: ${count.toLocaleString()} words`);
  });
  
  return processed;
}

async function importToDatabase(allWords) {
  console.log(`\n📦 Importing to database...`);
  
  const dbPath = path.join(__dirname, '..', 'wordmaster.db');
  const db = new sqlite3(dbPath);
  
  // Ensure table exists
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
  `);
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO words 
    (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((words) => {
    for (const w of words) {
      insert.run(
        w.id, w.word, w.translation, w.difficulty,
        w.category, w.frequency_rank, w.cefr_level,
        w.source_lang, w.target_lang
      );
    }
  });
  
  insertMany(allWords);
  
  // Stats
  const total = db.prepare('SELECT COUNT(*) as count FROM words').get();
  const byLang = db.prepare(`
    SELECT target_lang, COUNT(*) as count 
    FROM words 
    GROUP BY target_lang 
    ORDER BY target_lang
  `).all();
  
  console.log(`\n✅ Database updated!`);
  console.log(`  Total words: ${total.count.toLocaleString()}`);
  console.log(`  By language:`);
  byLang.forEach(row => {
    console.log(`    ${row.target_lang}: ${row.count.toLocaleString()}`);
  });
  
  db.close();
}

async function main() {
  console.log('🌍 Multi-Language Import\n');
  
  const allWords = [];
  
  for (const [code, config] of Object.entries(LANGUAGES)) {
    try {
      const words = await importLanguage(code);
      allWords.push(...words);
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  if (allWords.length > 0) {
    await importToDatabase(allWords);
  }
  
  console.log(`\n🎉 Done! Imported ${allWords.length.toLocaleString()} words total\n`);
}

if (require.main === module) {
  main().catch(console.error);
}
