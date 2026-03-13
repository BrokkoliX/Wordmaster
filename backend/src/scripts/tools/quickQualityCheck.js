/**
 * Quick quality check of enhanced vocabulary
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function quickCheck() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 QUICK QUALITY CHECK');
    console.log('=' .repeat(40));
    
    // Basic stats
    const basicStats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT source_lang || target_lang) as pairs,
        COUNT(CASE WHEN category = 'dictionary_mined' THEN 1 END) as new_words
      FROM words
    `);
    
    const stats = basicStats.rows[0];
    console.log(`Total vocabulary: ${parseInt(stats.total).toLocaleString()}`);
    console.log(`Language pairs: ${stats.pairs}`);
    console.log(`New words from mining: ${parseInt(stats.new_words).toLocaleString()}`);
    console.log(`Enhancement rate: ${((stats.new_words / stats.total) * 100).toFixed(1)}%`);
    
    // CEFR distribution
    console.log('\n📊 CEFR Distribution:');
    const cefrResult = await client.query(`
      SELECT cefr_level, COUNT(*) as count 
      FROM words 
      GROUP BY cefr_level 
      ORDER BY CASE cefr_level 
        WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'B1' THEN 3 
        WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6 END
    `);
    
    cefrResult.rows.forEach(row => {
      const pct = ((row.count / stats.total) * 100).toFixed(1);
      console.log(`  ${row.cefr_level}: ${parseInt(row.count).toLocaleString()} (${pct}%)`);
    });
    
    // Language breakdown
    console.log('\n🌍 Language Pairs:');
    const langResult = await client.query(`
      SELECT source_lang, target_lang, COUNT(*) as count 
      FROM words 
      GROUP BY source_lang, target_lang 
      ORDER BY count DESC
    `);
    
    langResult.rows.forEach(row => {
      console.log(`  ${row.source_lang} → ${row.target_lang}: ${parseInt(row.count).toLocaleString()}`);
    });
    
    // Quality samples
    console.log('\n📝 Random Quality Samples:');
    const samples = await client.query(`
      SELECT word, translation, source_lang, target_lang, cefr_level
      FROM words 
      WHERE category = 'dictionary_mined'
      ORDER BY RANDOM() 
      LIMIT 8
    `);
    
    samples.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.source_lang}→${row.target_lang}: "${row.word}" → "${row.translation}" [${row.cefr_level}]`);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

quickCheck().catch(console.error);