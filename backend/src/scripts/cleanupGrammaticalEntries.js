/**
 * Clean up remaining grammatical entries with comprehensive filtering
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function cleanupGrammaticalEntries() {
  console.log('🧹 CLEANING UP REMAINING GRAMMATICAL ENTRIES');
  console.log('=' .repeat(60));
  
  const client = await pool.connect();
  
  try {
    // First, let's see what we're dealing with
    console.log('\n📊 Current vocabulary statistics:');
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total_words,
        COUNT(CASE WHEN category = 'dictionary_mined' THEN 1 END) as dictionary_mined
      FROM words
    `);
    
    const stats = statsResult.rows[0];
    console.log(`  Total words: ${parseInt(stats.total_words).toLocaleString()}`);
    console.log(`  Dictionary mined: ${parseInt(stats.dictionary_mined).toLocaleString()}`);
    
    // Comprehensive cleanup patterns
    const cleanupQueries = [
      {
        name: 'Infinitive forms',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%infinitive of%' OR LOWER(translation) LIKE '%infinitive form of%'`
      },
      {
        name: 'Past tense forms',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%past tense of%' OR LOWER(translation) LIKE '%past participle of%'`
      },
      {
        name: 'Present forms',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%present tense of%' OR LOWER(translation) LIKE '%present participle of%'`
      },
      {
        name: 'Conjugation references',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%conjugation of%' OR LOWER(translation) LIKE '%conjugated form%'`
      },
      {
        name: 'Inflection references',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%inflection of%' OR LOWER(translation) LIKE '%inflected form%'`
      },
      {
        name: 'Plural/Singular forms',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%plural of%' OR LOWER(translation) LIKE '%singular of%'`
      },
      {
        name: 'Gender forms',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%feminine of%' OR LOWER(translation) LIKE '%masculine of%' OR LOWER(translation) LIKE '%neuter of%'`
      },
      {
        name: 'Case forms',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%nominative%' OR LOWER(translation) LIKE '%accusative%' OR LOWER(translation) LIKE '%genitive%' OR LOWER(translation) LIKE '%dative%'`
      },
      {
        name: 'Alternative forms',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%alternative form of%' OR LOWER(translation) LIKE '%variant of%'`
      },
      {
        name: 'Archaic/Obsolete forms',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%archaic form%' OR LOWER(translation) LIKE '%obsolete form%'`
      },
      {
        name: 'Comparative/Superlative',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%comparative of%' OR LOWER(translation) LIKE '%superlative of%'`
      },
      {
        name: 'Contractions',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%contraction of%' OR LOWER(translation) LIKE '%abbreviation of%'`
      },
      {
        name: 'Letter references',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%letter of the%' OR LOWER(translation) LIKE '%letter in the%'`
      },
      {
        name: 'Alphabet references',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE '%alphabet%' AND LENGTH(word) <= 2`
      },
      {
        name: 'Usage descriptions (starts with)',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE 'used to %' OR LOWER(translation) LIKE 'refers to %'`
      },
      {
        name: 'Definition descriptions',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE 'one who %' OR LOWER(translation) LIKE 'someone who %'`
      },
      {
        name: 'Process descriptions',
        query: `DELETE FROM words WHERE LOWER(translation) LIKE 'the act of %' OR LOWER(translation) LIKE 'the process of %'`
      },
      {
        name: 'Very long translations (likely explanations)',
        query: `DELETE FROM words WHERE LENGTH(translation) > 60`
      },
      {
        name: 'Multiple slash alternatives',
        query: `DELETE FROM words WHERE (LENGTH(translation) - LENGTH(REPLACE(translation, '/', ''))) > 3`
      },
      {
        name: 'Words with brackets (likely annotations)',
        query: `DELETE FROM words WHERE translation LIKE '%[%' OR translation LIKE '%]%'`
      },
      {
        name: 'Words with parenthetical explanations',
        query: `DELETE FROM words WHERE translation ~ '\\([^)]+\\)' AND LENGTH(translation) > 30`
      },
      {
        name: 'Single letter words (often alphabet)',
        query: `DELETE FROM words WHERE LENGTH(TRIM(word)) = 1 AND word ~ '^[A-Za-z]$'`
      },
      {
        name: 'Number-like words',
        query: `DELETE FROM words WHERE word ~ '^[0-9]+$' OR translation ~ '^[0-9]+$'`
      }
    ];
    
    console.log('\n🧹 Starting cleanup process...');
    
    let totalRemoved = 0;
    
    for (const cleanup of cleanupQueries) {
      console.log(`\n  Processing: ${cleanup.name}`);
      
      const result = await client.query(cleanup.query);
      const removed = result.rowCount || 0;
      totalRemoved += removed;
      
      if (removed > 0) {
        console.log(`    ❌ Removed: ${removed.toLocaleString()} entries`);
      } else {
        console.log(`    ✅ Clean: 0 entries found`);
      }
    }
    
    // Final statistics
    const finalStatsResult = await client.query(`
      SELECT 
        COUNT(*) as total_words,
        COUNT(CASE WHEN category = 'dictionary_mined' THEN 1 END) as dictionary_mined
      FROM words
    `);
    
    const finalStats = finalStatsResult.rows[0];
    
    console.log('\n📊 CLEANUP SUMMARY:');
    console.log('-'.repeat(40));
    console.log(`Before cleanup: ${parseInt(stats.total_words).toLocaleString()} words`);
    console.log(`After cleanup: ${parseInt(finalStats.total_words).toLocaleString()} words`);
    console.log(`Total removed: ${totalRemoved.toLocaleString()} grammatical entries`);
    console.log(`Quality improvement: ${((totalRemoved / stats.total_words) * 100).toFixed(2)}% cleaner`);
    
    // Sample remaining entries for verification
    console.log('\n📝 Sample remaining entries (verification):');
    const sampleResult = await client.query(`
      SELECT word, translation, source_lang, target_lang, cefr_level
      FROM words 
      ORDER BY RANDOM() 
      LIMIT 10
    `);
    
    sampleResult.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.source_lang}→${row.target_lang}: "${row.word}" → "${row.translation}" [${row.cefr_level}]`);
    });
    
    console.log('\n✅ GRAMMATICAL CLEANUP COMPLETE!');
    
    return {
      before: parseInt(stats.total_words),
      after: parseInt(finalStats.total_words),
      removed: totalRemoved
    };
    
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  cleanupGrammaticalEntries().catch(console.error);
}

module.exports = { cleanupGrammaticalEntries };