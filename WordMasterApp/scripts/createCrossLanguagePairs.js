/**
 * Create Cross-Language Pairs from Wiktionary Data
 * 
 * Uses the Spanish.jsonl Wiktionary data you already have to create:
 * - Spanish ↔ French
 * - Spanish ↔ German  
 * - Spanish ↔ Hungarian
 * 
 * Then can be extended to French ↔ German, etc.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sqlite3 = require('better-sqlite3');

// CEFR levels (same as before)
const CEFR_LEVELS = {
  A1: { min: 1, max: 500, difficulty: 1 },
  A2: { min: 501, max: 1500, difficulty: 2 },
  B1: { min: 1501, max: 3000, difficulty: 3 },
  B2: { min: 3001, max: 6000, difficulty: 5 },
  C1: { min: 6001, max: 12000, difficulty: 7 },
  C2: { min: 12001, max: 30000, difficulty: 9 }
};

const languageNames = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  hu: 'Hungarian'
};

function assignCEFR(rank) {
  for (const [level, range] of Object.entries(CEFR_LEVELS)) {
    if (rank >= range.min && rank <= range.max) {
      return { cefr: level, difficulty: range.difficulty };
    }
  }
  return { cefr: 'C2', difficulty: 10 };
}

// Parse Wiktionary JSONL file
async function parseWiktionary(wiktPath) {
  console.log('\n📖 Parsing Wiktionary data...');
  console.log(`   File: ${wiktPath}\n`);
  
  const translations = new Map(); // Spanish word → {fr: [...], de: [...], hu: [...]}
  
  if (!fs.existsSync(wiktPath)) {
    console.log('❌ Wiktionary file not found!');
    console.log('   Expected: ' + wiktPath);
    return translations;
  }
  
  const fileStream = fs.createReadStream(wiktPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let lineCount = 0;
  let wordsWithTranslations = 0;
  
  for await (const line of rl) {
    lineCount++;
    
    if (lineCount % 100000 === 0) {
      process.stdout.write(`\r   Processed ${lineCount.toLocaleString()} entries, found ${wordsWithTranslations.toLocaleString()} words with translations`);
    }
    
    try {
      const entry = JSON.parse(line);
      const spanishWord = entry.word;
      
      if (!entry.translations || entry.translations.length === 0) {
        continue;
      }
      
      // Extract translations to French, German, Hungarian
      const wordTranslations = {
        fr: [],
        de: [],
        hu: []
      };
      
      let hasTranslations = false;
      
      for (const trans of entry.translations) {
        const langCode = trans.code || trans.lang_code;
        
        if (langCode === 'fr' || langCode === 'de' || langCode === 'hu') {
          if (trans.word && !wordTranslations[langCode].includes(trans.word)) {
            wordTranslations[langCode].push(trans.word);
            hasTranslations = true;
          }
        }
      }
      
      if (hasTranslations) {
        translations.set(spanishWord.toLowerCase(), wordTranslations);
        wordsWithTranslations++;
      }
      
    } catch (e) {
      // Skip malformed lines
    }
  }
  
  console.log(`\n\n✅ Parsing complete!`);
  console.log(`   Total entries: ${lineCount.toLocaleString()}`);
  console.log(`   Words with translations: ${wordsWithTranslations.toLocaleString()}`);
  
  return translations;
}

// Get Spanish words from database
function getSpanishWords(db) {
  console.log('\n📚 Loading Spanish words from database...');
  
  const words = db.prepare(`
    SELECT * FROM words 
    WHERE target_lang = 'es' AND source_lang = 'en'
    ORDER BY frequency_rank
    LIMIT 10000
  `).all();
  
  console.log(`   Found ${words.length.toLocaleString()} Spanish words`);
  
  return words;
}

// Create cross-language pairs
function createCrossLanguagePairs(spanishWords, translations, db) {
  console.log('\n🔄 Creating cross-language pairs...\n');
  
  const stats = {
    'es_fr': { matched: 0, total: 0 },
    'fr_es': { matched: 0, total: 0 },
    'es_de': { matched: 0, total: 0 },
    'de_es': { matched: 0, total: 0 },
    'es_hu': { matched: 0, total: 0 },
    'hu_es': { matched: 0, total: 0 }
  };
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO words 
    (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((pairs) => {
    for (const pair of pairs) {
      insert.run(
        pair.id, pair.word, pair.translation, pair.difficulty,
        pair.category, pair.frequency_rank, pair.cefr_level,
        pair.source_lang, pair.target_lang
      );
    }
  });
  
  // Process each Spanish word
  for (const spanishWord of spanishWords) {
    const word = spanishWord.word.toLowerCase();
    const wiktTranslations = translations.get(word);
    
    if (!wiktTranslations) {
      continue;
    }
    
    const { cefr, difficulty } = assignCEFR(spanishWord.frequency_rank);
    
    // Spanish → French
    if (wiktTranslations.fr && wiktTranslations.fr.length > 0) {
      const frenchWord = wiktTranslations.fr[0]; // Use first (most common) translation
      
      const pairs = [
        // Spanish → French
        {
          id: `es_fr_${spanishWord.frequency_rank}`,
          word: spanishWord.word,
          translation: frenchWord,
          difficulty,
          category: spanishWord.category || 'general',
          frequency_rank: spanishWord.frequency_rank,
          cefr_level: cefr,
          source_lang: 'es',
          target_lang: 'fr'
        },
        // French → Spanish (reverse)
        {
          id: `fr_es_${spanishWord.frequency_rank}`,
          word: frenchWord,
          translation: spanishWord.word,
          difficulty,
          category: spanishWord.category || 'general',
          frequency_rank: spanishWord.frequency_rank,
          cefr_level: cefr,
          source_lang: 'fr',
          target_lang: 'es'
        }
      ];
      
      insertMany(pairs);
      stats['es_fr'].matched++;
      stats['fr_es'].matched++;
    }
    stats['es_fr'].total++;
    stats['fr_es'].total++;
    
    // Spanish → German
    if (wiktTranslations.de && wiktTranslations.de.length > 0) {
      const germanWord = wiktTranslations.de[0];
      
      const pairs = [
        {
          id: `es_de_${spanishWord.frequency_rank}`,
          word: spanishWord.word,
          translation: germanWord,
          difficulty,
          category: spanishWord.category || 'general',
          frequency_rank: spanishWord.frequency_rank,
          cefr_level: cefr,
          source_lang: 'es',
          target_lang: 'de'
        },
        {
          id: `de_es_${spanishWord.frequency_rank}`,
          word: germanWord,
          translation: spanishWord.word,
          difficulty,
          category: spanishWord.category || 'general',
          frequency_rank: spanishWord.frequency_rank,
          cefr_level: cefr,
          source_lang: 'de',
          target_lang: 'es'
        }
      ];
      
      insertMany(pairs);
      stats['es_de'].matched++;
      stats['de_es'].matched++;
    }
    stats['es_de'].total++;
    stats['de_es'].total++;
    
    // Spanish → Hungarian
    if (wiktTranslations.hu && wiktTranslations.hu.length > 0) {
      const hungarianWord = wiktTranslations.hu[0];
      
      const pairs = [
        {
          id: `es_hu_${spanishWord.frequency_rank}`,
          word: spanishWord.word,
          translation: hungarianWord,
          difficulty,
          category: spanishWord.category || 'general',
          frequency_rank: spanishWord.frequency_rank,
          cefr_level: cefr,
          source_lang: 'es',
          target_lang: 'hu'
        },
        {
          id: `hu_es_${spanishWord.frequency_rank}`,
          word: hungarianWord,
          translation: spanishWord.word,
          difficulty,
          category: spanishWord.category || 'general',
          frequency_rank: spanishWord.frequency_rank,
          cefr_level: cefr,
          source_lang: 'hu',
          target_lang: 'es'
        }
      ];
      
      insertMany(pairs);
      stats['es_hu'].matched++;
      stats['hu_es'].matched++;
    }
    stats['es_hu'].total++;
    stats['hu_es'].total++;
  }
  
  return stats;
}

// Main function
async function main() {
  console.log('🌍 Cross-Language Pair Creator');
  console.log('Using Wiktionary data to create Spanish ↔ FR/DE/HU pairs\n');
  console.log('='.repeat(60));
  
  // Paths
  const wiktPath = path.join(__dirname, '../../data/kaikki/Spanish.jsonl');
  const dbPath = path.join(__dirname, '..', 'wordmaster.db');
  
  // Parse Wiktionary
  const translations = await parseWiktionary(wiktPath);
  
  if (translations.size === 0) {
    console.log('\n❌ No translations found. Cannot proceed.');
    return;
  }
  
  // Open database
  const db = new sqlite3(dbPath);
  
  // Get Spanish words
  const spanishWords = getSpanishWords(db);
  
  // Create pairs
  const stats = createCrossLanguagePairs(spanishWords, translations, db);
  
  // Show statistics
  console.log('\n📊 Results:\n');
  console.log('Spanish → French:');
  console.log(`   Matched: ${stats.es_fr.matched.toLocaleString()} / ${stats.es_fr.total.toLocaleString()}`);
  console.log(`   Success rate: ${((stats.es_fr.matched / stats.es_fr.total) * 100).toFixed(1)}%`);
  
  console.log('\nFrench → Spanish:');
  console.log(`   Matched: ${stats.fr_es.matched.toLocaleString()} / ${stats.fr_es.total.toLocaleString()}`);
  console.log(`   Success rate: ${((stats.fr_es.matched / stats.fr_es.total) * 100).toFixed(1)}%`);
  
  console.log('\nSpanish → German:');
  console.log(`   Matched: ${stats.es_de.matched.toLocaleString()} / ${stats.es_de.total.toLocaleString()}`);
  console.log(`   Success rate: ${((stats.es_de.matched / stats.es_de.total) * 100).toFixed(1)}%`);
  
  console.log('\nGerman → Spanish:');
  console.log(`   Matched: ${stats.de_es.matched.toLocaleString()} / ${stats.de_es.total.toLocaleString()}`);
  console.log(`   Success rate: ${((stats.de_es.matched / stats.de_es.total) * 100).toFixed(1)}%`);
  
  console.log('\nSpanish → Hungarian:');
  console.log(`   Matched: ${stats.es_hu.matched.toLocaleString()} / ${stats.es_hu.total.toLocaleString()}`);
  console.log(`   Success rate: ${((stats.es_hu.matched / stats.es_hu.total) * 100).toFixed(1)}%`);
  
  console.log('\nHungarian → Spanish:');
  console.log(`   Matched: ${stats.hu_es.matched.toLocaleString()} / ${stats.hu_es.total.toLocaleString()}`);
  console.log(`   Success rate: ${((stats.hu_es.matched / stats.hu_es.total) * 100).toFixed(1)}%`);
  
  const totalMatched = stats.es_fr.matched + stats.fr_es.matched + 
                       stats.es_de.matched + stats.de_es.matched +
                       stats.es_hu.matched + stats.hu_es.matched;
  
  console.log(`\n✨ Total new cross-language pairs: ${totalMatched.toLocaleString()}`);
  
  // Final database stats
  console.log('\n📊 Final Database Statistics:\n');
  
  const allPairs = db.prepare(`
    SELECT source_lang, target_lang, COUNT(*) as count 
    FROM words 
    GROUP BY source_lang, target_lang 
    ORDER BY source_lang, target_lang
  `).all();
  
  console.log('All Language Pairs:');
  allPairs.forEach(row => {
    console.log(`   ${row.source_lang} → ${row.target_lang}: ${row.count.toLocaleString()} words`);
  });
  
  const total = db.prepare('SELECT COUNT(*) as count FROM words').get();
  console.log(`\n✨ Total words in database: ${total.count.toLocaleString()}`);
  
  db.close();
  
  console.log('\n🎉 Cross-language pairs created successfully!\n');
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
}

module.exports = { parseWiktionary, createCrossLanguagePairs };
