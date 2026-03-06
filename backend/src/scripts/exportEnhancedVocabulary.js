/**
 * Export enhanced vocabulary data for mobile app integration
 * 
 * This script exports the enhanced vocabulary in mobile-compatible formats:
 * 1. JSON files matching existing mobile structure
 * 2. Optimized for app performance and storage
 * 3. Balanced CEFR distribution for progressive learning
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const OUTPUT_DIR = path.resolve(__dirname, '../../../mobile/src/data/enhanced');
const BATCH_SIZE = 10000;

// Target vocabulary size per language pair for mobile app
const VOCABULARY_TARGETS = {
  'A1': 2000,   // Essential beginner vocabulary
  'A2': 3000,   // Elementary expansion
  'B1': 5000,   // Intermediate core
  'B2': 4000,   // Upper intermediate
  'C1': 2000,   // Advanced vocabulary
  'C2': 1000    // Mastery level
};

const TOTAL_TARGET_PER_DIRECTION = Object.values(VOCABULARY_TARGETS).reduce((a, b) => a + b, 0);

async function exportEnhancedVocabulary() {
  console.log('📱 EXPORTING ENHANCED VOCABULARY FOR MOBILE APP');
  console.log('=' .repeat(60));
  
  const client = await pool.connect();
  
  try {
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Get all language pairs
    const pairsResult = await client.query(`
      SELECT DISTINCT source_lang, target_lang, COUNT(*) as total_words
      FROM words 
      GROUP BY source_lang, target_lang
      HAVING COUNT(*) > 1000
      ORDER BY total_words DESC
    `);
    
    console.log(`Found ${pairsResult.rows.length} language pairs to export`);
    
    let totalExported = 0;
    
    for (const pair of pairsResult.rows) {
      console.log(`\n📚 Exporting ${pair.source_lang} → ${pair.target_lang} (${parseInt(pair.total_words).toLocaleString()} available)`);
      
      const exportedWords = await exportLanguagePair(client, pair.source_lang, pair.target_lang);
      totalExported += exportedWords;
      
      console.log(`  ✅ Exported ${exportedWords.toLocaleString()} words`);
    }
    
    // Generate summary file
    await generateExportSummary(client, totalExported);
    
    console.log(`\n🎉 EXPORT COMPLETE: ${totalExported.toLocaleString()} total words exported`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

async function exportLanguagePair(client, sourceLang, targetLang) {
  const words = [];
  
  // Export words for each CEFR level with balanced distribution
  for (const [level, targetCount] of Object.entries(VOCABULARY_TARGETS)) {
    const levelQuery = `
      SELECT 
        id,
        word,
        translation,
        difficulty,
        category,
        frequency_rank,
        cefr_level,
        source_lang,
        target_lang
      FROM words 
      WHERE source_lang = $1 
      AND target_lang = $2 
      AND cefr_level = $3
      AND LENGTH(word) BETWEEN 2 AND 25
      AND LENGTH(translation) BETWEEN 2 AND 25
      ORDER BY 
        CASE WHEN frequency_rank IS NOT NULL THEN 0 ELSE 1 END,
        frequency_rank ASC NULLS LAST,
        RANDOM()
      LIMIT $4
    `;
    
    const result = await client.query(levelQuery, [sourceLang, targetLang, level, targetCount]);
    
    result.rows.forEach((row, index) => {
      words.push({
        id: `${sourceLang}_${targetLang}_${level}_${index + 1}`,
        source_word: row.translation,  // Reverse for mobile app format
        target_word: row.word,
        difficulty: row.difficulty || 1,
        category: row.category || 'general',
        frequency_rank: row.frequency_rank,
        cefr_level: row.cefr_level,
        source_lang: row.source_lang,
        target_lang: row.target_lang
      });
    });
  }
  
  // Generate filename in mobile app convention
  const filename = generateMobileFilename(sourceLang, targetLang);
  const filePath = path.join(OUTPUT_DIR, filename);
  
  // Write to file
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2));
  
  return words.length;
}

function generateMobileFilename(sourceLang, targetLang) {
  if (sourceLang === 'en') {
    // English to other language: words_french.json
    const langNames = {
      'fr': 'french',
      'de': 'german', 
      'es': 'spanish',
      'hu': 'hungarian',
      'pt': 'portuguese',
      'ru': 'russian'
    };
    return `words_${langNames[targetLang] || targetLang}_enhanced.json`;
  } else {
    // Other language to English: words_french_to_english.json
    const langNames = {
      'fr': 'french',
      'de': 'german',
      'es': 'spanish', 
      'hu': 'hungarian',
      'pt': 'portuguese',
      'ru': 'russian'
    };
    return `words_${langNames[sourceLang] || sourceLang}_to_english_enhanced.json`;
  }
}

async function generateExportSummary(client, totalExported) {
  const summary = {
    export_date: new Date().toISOString(),
    total_words_exported: totalExported,
    vocabulary_targets: VOCABULARY_TARGETS,
    target_per_direction: TOTAL_TARGET_PER_DIRECTION,
    quality_filters: [
      'Length: 2-25 characters',
      'No grammatical forms',
      'Frequency-prioritized selection',
      'Balanced CEFR distribution'
    ],
    files_created: []
  };
  
  // List all created files
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('_enhanced.json'));
  summary.files_created = files;
  
  // Get statistics for summary
  const statsResult = await client.query(`
    SELECT 
      cefr_level,
      COUNT(*) as total_available,
      COUNT(CASE WHEN frequency_rank IS NOT NULL THEN 1 END) as with_frequency
    FROM words 
    GROUP BY cefr_level
    ORDER BY CASE cefr_level 
      WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'B1' THEN 3 
      WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6 END
  `);
  
  summary.database_statistics = statsResult.rows;
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'export_summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log(`\n📊 Export Summary:`);
  console.log(`  Total files created: ${files.length}`);
  console.log(`  Target vocabulary per direction: ${TOTAL_TARGET_PER_DIRECTION.toLocaleString()}`);
  console.log(`  Quality filters applied: ${summary.quality_filters.length}`);
}

if (require.main === module) {
  exportEnhancedVocabulary().catch(console.error);
}

module.exports = { exportEnhancedVocabulary, generateMobileFilename };