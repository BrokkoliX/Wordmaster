/**
 * Import All Languages to App Database
 * 
 * This imports all 252,000 words directly into the app's database
 * Run this from WordMasterApp directory
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const APP_DB_PATH = path.join(__dirname, '..', 'wordmaster.db');

// Language configurations
const LANGUAGES = {
  es: {
    name: 'Spanish',
    file: path.join(__dirname, '../../data/spanish/es_50k.txt'),
    flag: '🇪🇸'
  },
  fr: {
    name: 'French', 
    file: path.join(__dirname, '../../data/french/fr_50k.txt'),
    flag: '🇫🇷'
  },
  de: {
    name: 'German',
    file: path.join(__dirname, '../../data/german/de_50k.txt'),
    flag: '🇩🇪'
  },
  hu: {
    name: 'Hungarian',
    file: path.join(__dirname, '../../data/hungarian/hu_50k.txt'),
    flag: '🇭🇺'
  }
};

// CEFR level assignment
const CEFR_LEVELS = {
  A1: { min: 1, max: 500, difficulty: 1 },
  A2: { min: 501, max: 1500, difficulty: 2 },
  B1: { min: 1501, max: 3000, difficulty: 3 },
  B2: { min: 3001, max: 6000, difficulty: 5 },
  C1: { min: 6001, max: 12000, difficulty: 7 },
  C2: { min: 12001, max: 30000, difficulty: 9 }
};

function assignCEFR(rank) {
  for (const [level, range] of Object.entries(CEFR_LEVELS)) {
    if (rank >= range.min && rank <= range.max) {
      return { cefr: level, difficulty: range.difficulty };
    }
  }
  return { cefr: 'C2', difficulty: 9 };
}

function readFrequencyFile(filePath, maxWords = 30000) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const words = [];
  for (let i = 0; i < Math.min(lines.length, maxWords); i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length >= 1) {
      words.push({
        word: parts[0],
        rank: i + 1
      });
    }
  }
  
  return words;
}

async function importToDatabase(db, words) {
  console.log(`\n📥 Importing ${words.length.toLocaleString()} words to database...`);
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO words 
    (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((words) => {
    for (const word of words) {
      insert.run(
        word.id,
        word.word,
        word.translation,
        word.difficulty,
        word.category,
        word.frequency_rank,
        word.cefr_level,
        word.source_lang,
        word.target_lang
      );
    }
  });
  
  insertMany(words);
  console.log(`✅ Import complete!`);
}

async function main() {
  console.log('🌍 Importing All Languages to App Database\n');
  console.log(`Database: ${APP_DB_PATH}\n`);
  
  // Open database
  const db = new sqlite3(APP_DB_PATH);
  
  // Get current count
  const before = db.prepare('SELECT COUNT(*) as count FROM words').get();
  console.log(`Current word count: ${before.count.toLocaleString()}\n`);
  
  let totalImported = 0;
  
  // Import each language (to English and from English)
  for (const [langCode, config] of Object.entries(LANGUAGES)) {
    console.log(`${config.flag} Processing ${config.name}...`);
    
    if (!fs.existsSync(config.file)) {
      console.log(`  ⚠️  Frequency file not found, skipping`);
      continue;
    }
    
    const frequencyWords = readFrequencyFile(config.file, 30000);
    console.log(`  Loaded ${frequencyWords.length.toLocaleString()} words`);
    
    // Create bidirectional pairs (en ↔ lang)
    const wordsToImport = [];
    
    for (const fw of frequencyWords) {
      const { cefr, difficulty } = assignCEFR(fw.rank);
      
      // English → Target language
      wordsToImport.push({
        id: `${langCode}_${fw.rank}`,
        word: fw.word,
        translation: `[${langCode.toUpperCase()}] ${fw.word}`, // Placeholder
        difficulty,
        category: 'general',
        frequency_rank: fw.rank,
        cefr_level: cefr,
        source_lang: 'en',
        target_lang: langCode
      });
      
      // Target language → English
      wordsToImport.push({
        id: `${langCode}_en_${fw.rank}`,
        word: fw.word,
        translation: `[EN] ${fw.word}`, // Placeholder
        difficulty,
        category: 'general',
        frequency_rank: fw.rank,
        cefr_level: cefr,
        source_lang: langCode,
        target_lang: 'en'
      });
    }
    
    await importToDatabase(db, wordsToImport);
    totalImported += wordsToImport.length;
    
    console.log(`  CEFR Distribution:`);
    const cefrCounts = {};
    wordsToImport.forEach(w => {
      cefrCounts[w.cefr_level] = (cefrCounts[w.cefr_level] || 0) + 1;
    });
    Object.entries(cefrCounts).sort().forEach(([level, count]) => {
      console.log(`    ${level}: ${count.toLocaleString()} words`);
    });
  }
  
  // Final count
  const after = db.prepare('SELECT COUNT(*) as count FROM words').get();
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`Before: ${before.count.toLocaleString()} words`);
  console.log(`After: ${after.count.toLocaleString()} words`);
  console.log(`Added: ${(after.count - before.count).toLocaleString()} words`);
  
  // Show language pairs
  const pairs = db.prepare(`
    SELECT source_lang, target_lang, COUNT(*) as count
    FROM words
    GROUP BY source_lang, target_lang
    ORDER BY source_lang, target_lang
  `).all();
  
  console.log(`\nLanguage pairs available:`);
  pairs.forEach(pair => {
    console.log(`  ${pair.source_lang} → ${pair.target_lang}: ${pair.count.toLocaleString()} words`);
  });
  
  db.close();
  console.log(`\n✨ Done! App database is ready!\n`);
}

main().catch(console.error);
