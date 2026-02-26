/**
 * Create Bidirectional Language Pairs
 * 
 * This script creates reverse pairs for all languages, enabling:
 * - Spanish → English
 * - French → English  
 * - German → English
 * - Hungarian → English
 * 
 * And cross-language pairs:
 * - Spanish ↔ French
 * - Spanish ↔ German
 * - Spanish ↔ Hungarian
 * - French ↔ German
 * - French ↔ Hungarian
 * - German ↔ Hungarian
 * 
 * Total: 12 directional pairs (4 languages × 3 other languages)
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wordmaster.db');

console.log('🔄 Creating Bidirectional Language Pairs\n');

const db = new sqlite3(dbPath);

// Get current state
const current = db.prepare(`
  SELECT source_lang, target_lang, COUNT(*) as count 
  FROM words 
  GROUP BY source_lang, target_lang 
  ORDER BY source_lang, target_lang
`).all();

console.log('📊 Current Language Pairs:');
current.forEach(row => {
  console.log(`  ${row.source_lang} → ${row.target_lang}: ${row.count.toLocaleString()} words`);
});

console.log('\n🎯 Creating Reverse Pairs (Target → English)...\n');

// Create reverse pairs for each language
const languages = ['es', 'fr', 'de', 'hu', 'pt', 'ru'];
const languageNames = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  hu: 'Hungarian',
  pt: 'Portuguese',
  ru: 'Russian',
  en: 'English'
};

let totalAdded = 0;

// 1. Create reverse pairs (Target → English)
for (const lang of languages) {
  console.log(`📝 Creating ${languageNames[lang]} → English...`);
  
  // Get all words where source=en and target=lang
  const words = db.prepare(`
    SELECT * FROM words 
    WHERE source_lang = 'en' AND target_lang = ?
  `).all(lang);
  
  console.log(`  Found ${words.length.toLocaleString()} words to reverse`);
  
  const insert = db.prepare(`
    INSERT OR IGNORE INTO words 
    (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((words) => {
    let added = 0;
    for (const w of words) {
      // Swap: what was the target word becomes the "word to learn"
      // What was the translation (English) becomes the translation
      const newId = `${lang}_to_en_${w.frequency_rank}`;
      
      insert.run(
        newId,
        w.translation,        // Now learning the English word
        w.word,              // Translation is the original target language
        w.difficulty,
        w.category,
        w.frequency_rank,
        w.cefr_level,
        lang,                // Source is now the target language
        'en'                 // Target is English
      );
      added++;
    }
    return added;
  });
  
  const added = insertMany(words);
  totalAdded += added;
  console.log(`  ✅ Added ${added.toLocaleString()} ${languageNames[lang]} → English pairs\n`);
}

console.log('🌍 Creating Cross-Language Pairs...\n');

// 2. Create cross-language pairs (e.g., Spanish ↔ French)
const crossPairs = [];
for (let i = 0; i < languages.length; i++) {
  for (let j = i + 1; j < languages.length; j++) {
    crossPairs.push([languages[i], languages[j]]);
  }
}

console.log('Cross-language pairs to create:');
crossPairs.forEach(([lang1, lang2]) => {
  console.log(`  ${languageNames[lang1]} ↔ ${languageNames[lang2]}`);
});

console.log('\n⚠️  Note: Cross-language pairs require translation API');
console.log('   For now, we\'ll use English as bridge language:\n');
console.log('   Spanish word → (via English) → French translation\n');

// For cross-language pairs, we'll use English as a bridge
// Get Spanish words with English translations, then map to French
for (const [lang1, lang2] of crossPairs) {
  console.log(`📝 Creating ${languageNames[lang1]} → ${languageNames[lang2]}...`);
  
  // Get words in lang1 with English translations
  const lang1Words = db.prepare(`
    SELECT * FROM words 
    WHERE source_lang = 'en' AND target_lang = ?
    ORDER BY frequency_rank
    LIMIT 1000
  `).all(lang1);
  
  // For each lang1 word, find the equivalent lang2 word via English
  const insert = db.prepare(`
    INSERT OR IGNORE INTO words 
    (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let matched = 0;
  
  for (const w1 of lang1Words) {
    // Find the lang2 word that has the same English translation
    const w2 = db.prepare(`
      SELECT * FROM words 
      WHERE source_lang = 'en' 
        AND target_lang = ?
        AND translation = ?
      LIMIT 1
    `).get(lang2, w1.translation);
    
    if (w2) {
      // Create lang1 → lang2 pair
      const newId = `${lang1}_to_${lang2}_${matched}`;
      
      insert.run(
        newId,
        w1.word,              // lang1 word to learn
        w2.word,              // lang2 translation
        w1.difficulty,
        w1.category,
        w1.frequency_rank,
        w1.cefr_level,
        lang1,
        lang2
      );
      
      matched++;
    }
  }
  
  totalAdded += matched;
  console.log(`  ✅ Matched ${matched.toLocaleString()} words\n`);
  
  // Also create reverse (lang2 → lang1)
  console.log(`📝 Creating ${languageNames[lang2]} → ${languageNames[lang1]}...`);
  
  const lang2Words = db.prepare(`
    SELECT * FROM words 
    WHERE source_lang = 'en' AND target_lang = ?
    ORDER BY frequency_rank
    LIMIT 1000
  `).all(lang2);
  
  let matched2 = 0;
  
  for (const w2 of lang2Words) {
    const w1 = db.prepare(`
      SELECT * FROM words 
      WHERE source_lang = 'en' 
        AND target_lang = ?
        AND translation = ?
      LIMIT 1
    `).get(lang1, w2.translation);
    
    if (w1) {
      const newId = `${lang2}_to_${lang1}_${matched2}`;
      
      insert.run(
        newId,
        w2.word,
        w1.word,
        w2.difficulty,
        w2.category,
        w2.frequency_rank,
        w2.cefr_level,
        lang2,
        lang1
      );
      
      matched2++;
    }
  }
  
  totalAdded += matched2;
  console.log(`  ✅ Matched ${matched2.toLocaleString()} words\n`);
}

// Final statistics
console.log('\n📊 Final Database Statistics:\n');

const final = db.prepare(`
  SELECT source_lang, target_lang, COUNT(*) as count 
  FROM words 
  GROUP BY source_lang, target_lang 
  ORDER BY source_lang, target_lang
`).all();

const total = db.prepare('SELECT COUNT(*) as count FROM words').get();

console.log('All Language Pairs:');
final.forEach(row => {
  console.log(`  ${row.source_lang} → ${row.target_lang}: ${row.count.toLocaleString()} words`);
});

console.log(`\n✨ Total words in database: ${total.count.toLocaleString()}`);
console.log(`✅ Added ${totalAdded.toLocaleString()} new directional pairs\n`);

db.close();

console.log('🎉 Bidirectional pairs created!\n');
console.log('📝 Summary:');
console.log('  ✅ English → Other Languages (original)');
console.log('  ✅ Other Languages → English (NEW)');
console.log('  ✅ Cross-language pairs via English bridge (NEW - limited to 1000 words each)');
console.log('\n💡 To expand cross-language pairs:');
console.log('  - Use translation API for direct translation');
console.log('  - Or increase the matching limit in this script\n');
