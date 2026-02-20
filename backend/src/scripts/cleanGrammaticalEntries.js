/**
 * Clean existing PostgreSQL database by removing grammatical description entries
 * 
 * Run this on your AWS RDS database to remove problematic entries that
 * may have been imported before the filtering was added.
 *
 * Usage:
 *   node src/scripts/cleanGrammaticalEntries.js
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function cleanGrammaticalEntries() {
  const client = await pool.connect();

  try {
    console.log('🧹 Cleaning grammatical description entries from database...\n');
    
    // Count entries before cleaning
    const beforeCount = await client.query('SELECT COUNT(*) as count FROM words');
    console.log(`📊 Total words before cleaning: ${parseInt(beforeCount.rows[0].count).toLocaleString()}`);
    
    // Remove entries with grammatical descriptions (AGGRESSIVE)
    const deleteQuery = `
      DELETE FROM words
      WHERE 
        -- Case markers
        translation ILIKE '%nominative%'
        OR translation ILIKE '%accusative%'
        OR translation ILIKE '%dative%'
        OR translation ILIKE '%genitive%'
        
        -- Verb forms and tenses (with and without hyphens)
        OR translation ILIKE '%first person%'
        OR translation ILIKE '%first-person%'
        OR translation ILIKE '%second person%'
        OR translation ILIKE '%second-person%'
        OR translation ILIKE '%third person%'
        OR translation ILIKE '%third-person%'
        OR translation ILIKE '%past tense%'
        OR translation ILIKE '%past-tense%'
        OR translation ILIKE '%present tense%'
        OR translation ILIKE '%present-tense%'
        OR translation ILIKE '%future tense%'
        OR translation ILIKE '%future-tense%'
        OR translation ILIKE '%past participle%'
        OR translation ILIKE '%past-participle%'
        OR translation ILIKE '%present participle%'
        OR translation ILIKE '%present-participle%'
        OR translation ILIKE '%imperative%'
        OR translation ILIKE '%subjunctive%'
        OR translation ILIKE '%infinitive of%'
        
        -- Grammatical terms
        OR translation ILIKE '%inflection of%'
        OR translation ILIKE '%conjugation of%'
        OR translation ILIKE '%declension of%'
        OR translation ILIKE '%form of%'
        OR translation ILIKE '%singular of%'
        OR translation ILIKE '%plural of%'
        OR translation ILIKE '%disjunctive form%'
        OR translation ILIKE '%alternative form%'
        OR translation ILIKE '%comparative of%'
        OR translation ILIKE '%superlative of%'
        
        -- Gender markers
        OR translation ILIKE '%masculine%'
        OR translation ILIKE '%feminine%'
        OR translation ILIKE '%neuter%'
        
        -- Question words with explanations
        OR translation ILIKE '%interrogative%'
        
        -- Definitions with colons
        OR translation LIKE '%:%'
        
        -- Parenthetical grammatical terms and explanations
        OR translation ILIKE '%(pronoun%'
        OR translation ILIKE '%(verb%'
        OR translation ILIKE '%(noun%'
        OR translation ILIKE '%(adjective%'
        OR translation ILIKE '%(adverb%'
        OR translation ILIKE '%(preposition%'
        OR translation ILIKE '%(conjunction%'
        OR translation ILIKE '%(personal%'
        OR translation ILIKE '%(cardinal%'
        OR translation ILIKE '%(ordinal%'
        OR translation ILIKE '%(co-ordinating%'
        OR translation ILIKE '%(coordinating%'
        
        -- Abbreviations and acronyms
        OR translation ILIKE '%initialism%'
        OR translation ILIKE '%abbreviation%'
        OR translation ILIKE '%acronym%'
        
        -- Common definition phrases
        OR translation ILIKE '%refers to%'
        OR translation ILIKE '%used to%'
        OR translation ILIKE '%indicates%'
        OR translation ILIKE '%denotes%'
        
        -- Alphabet descriptions
        OR translation ILIKE '%letter of the%alphabet%'
        OR translation ILIKE '%called%written in%'
        
        -- Word in target also has grammatical terms
        OR word ILIKE '%nominative%'
        OR word ILIKE '%accusative%'
        OR word ILIKE '%dative%'
        OR word ILIKE '%genitive%'
        OR word ILIKE '%interrogative%'
        
        -- Long descriptions
        OR LENGTH(translation) > 80
    `;
    
    const result = await client.query(deleteQuery);
    console.log(`🗑️  Removed ${result.rowCount.toLocaleString()} grammatical entries`);
    
    // Count entries after cleaning
    const afterCount = await client.query('SELECT COUNT(*) as count FROM words');
    console.log(`📊 Total words after cleaning: ${parseInt(afterCount.rows[0].count).toLocaleString()}\n`);
    
    // Show some examples of what remains
    console.log('📝 Sample words after cleaning (first 10):');
    const samples = await client.query(`
      SELECT word, translation, cefr_level, target_lang
      FROM words
      ORDER BY frequency_rank
      LIMIT 10
    `);
    
    samples.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.word} → ${row.translation} (${row.target_lang}, ${row.cefr_level})`);
    });
    
    // Show breakdown by language
    console.log('\n🌍 Words by language after cleaning:');
    const langStats = await client.query(`
      SELECT target_lang, COUNT(*) as count
      FROM words
      GROUP BY target_lang
      ORDER BY count DESC
    `);
    
    langStats.rows.forEach(s => {
      console.log(`   ${s.target_lang}: ${parseInt(s.count).toLocaleString()} words`);
    });
    
    // Clean up orphaned progress entries
    console.log('\n🧹 Cleaning orphaned progress entries...');
    const cleanProgress = await client.query(`
      DELETE FROM user_word_progress
      WHERE word_id NOT IN (SELECT id FROM words)
    `);
    
    if (cleanProgress.rowCount > 0) {
      console.log(`   Removed ${cleanProgress.rowCount} orphaned progress entries`);
    } else {
      console.log('   No orphaned progress entries found');
    }
    
    console.log('\n✅ Database cleaned successfully!');
    console.log('💡 Tip: Re-run seedWords.js with updated filters for best results');
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanGrammaticalEntries();
