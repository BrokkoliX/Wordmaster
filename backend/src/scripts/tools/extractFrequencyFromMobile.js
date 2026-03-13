/**
 * Extract frequency data from existing mobile JSON files to enhance database
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function extractFrequencyFromMobile() {
  console.log('🎯 EXTRACTING FREQUENCY DATA FROM MOBILE FILES');
  console.log('=' .repeat(50));
  
  const client = await pool.connect();
  const mobileDataDir = path.resolve(__dirname, '../../../mobile/src/data');
  
  try {
    const mobileFiles = [
      { file: 'words_french.json', source: 'en', target: 'fr' },
      { file: 'words_french_to_english.json', source: 'fr', target: 'en' },
      { file: 'words_german.json', source: 'en', target: 'de' },
      { file: 'words_german_to_english.json', source: 'de', target: 'en' },
      { file: 'words_spanish_to_english.json', source: 'es', target: 'en' },
      { file: 'words_hungarian.json', source: 'en', target: 'hu' },
      { file: 'words_hungarian_to_english.json', source: 'hu', target: 'en' },
      { file: 'words_portuguese.json', source: 'en', target: 'pt' },
      { file: 'words_portuguese_to_english.json', source: 'pt', target: 'en' },
      { file: 'words_russian.json', source: 'en', target: 'ru' },
      { file: 'words_russian_to_english.json', source: 'ru', target: 'en' },
    ];
    
    let totalUpdated = 0;
    
    for (const { file, source, target } of mobileFiles) {
      const filePath = path.join(mobileDataDir, file);
      
      if (!fs.existsSync(filePath)) {
        console.log(`  ⏭️  File not found: ${file}`);
        continue;
      }
      
      console.log(`\n📚 Processing ${file}...`);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        if (!Array.isArray(data)) {
          console.log(`  ⚠️  Invalid format: ${file}`);
          continue;
        }
        
        let fileUpdated = 0;
        
        for (const word of data) {
          if (word.frequency_rank && word.source_word && word.target_word) {
            // Update database with frequency rank
            const updateQuery = `
              UPDATE words 
              SET frequency_rank = $1 
              WHERE LOWER(word) = $2 
              AND LOWER(translation) = $3 
              AND source_lang = $4 
              AND target_lang = $5
              AND frequency_rank IS NULL
            `;
            
            const result = await client.query(updateQuery, [
              word.frequency_rank,
              word.target_word.toLowerCase(),
              word.source_word.toLowerCase(),
              source,
              target
            ]);
            
            fileUpdated += result.rowCount;
          }
        }
        
        console.log(`  ✅ Updated ${fileUpdated.toLocaleString()} words with frequency data`);
        totalUpdated += fileUpdated;
        
      } catch (error) {
        console.error(`  ❌ Error processing ${file}:`, error.message);
      }
    }
    
    console.log(`\n📊 Total words updated with frequency data: ${totalUpdated.toLocaleString()}`);
    
    // Now rebalance CEFR levels based on frequency
    console.log('\n⚖️  REBALANCING CEFR LEVELS BASED ON FREQUENCY');
    console.log('-'.repeat(50));
    
    const rebalanceQueries = [
      {
        level: 'A1',
        query: `UPDATE words SET cefr_level = 'A1' WHERE frequency_rank <= 1000 AND frequency_rank IS NOT NULL`,
        description: 'Top 1000 most frequent → A1'
      },
      {
        level: 'A2', 
        query: `UPDATE words SET cefr_level = 'A2' WHERE frequency_rank > 1000 AND frequency_rank <= 2000 AND frequency_rank IS NOT NULL`,
        description: 'Frequency 1001-2000 → A2'
      },
      {
        level: 'B1',
        query: `UPDATE words SET cefr_level = 'B1' WHERE frequency_rank > 2000 AND frequency_rank <= 5000 AND frequency_rank IS NOT NULL`,
        description: 'Frequency 2001-5000 → B1'
      },
      {
        level: 'B2',
        query: `UPDATE words SET cefr_level = 'B2' WHERE frequency_rank > 5000 AND frequency_rank <= 10000 AND frequency_rank IS NOT NULL`,
        description: 'Frequency 5001-10000 → B2'
      },
      {
        level: 'C1',
        query: `UPDATE words SET cefr_level = 'C1' WHERE frequency_rank > 10000 AND frequency_rank <= 20000 AND frequency_rank IS NOT NULL`,
        description: 'Frequency 10001-20000 → C1'
      }
    ];
    
    for (const { level, query, description } of rebalanceQueries) {
      const result = await client.query(query);
      console.log(`  ${level}: ${result.rowCount.toLocaleString()} words (${description})`);
    }
    
    // Final statistics
    console.log('\n📈 ENHANCEMENT SUMMARY');
    console.log('-'.repeat(30));
    
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN frequency_rank IS NOT NULL THEN 1 END) as with_frequency,
        ROUND(AVG(CASE WHEN frequency_rank IS NOT NULL THEN frequency_rank END)) as avg_frequency
      FROM words
    `);
    
    const stats = statsResult.rows[0];
    console.log(`Total vocabulary: ${parseInt(stats.total).toLocaleString()}`);
    console.log(`With frequency data: ${parseInt(stats.with_frequency).toLocaleString()} (${((stats.with_frequency/stats.total)*100).toFixed(1)}%)`);
    console.log(`Average frequency rank: ${stats.avg_frequency ? parseInt(stats.avg_frequency).toLocaleString() : 'N/A'}`);
    
    // CEFR distribution after rebalancing
    const cefrResult = await client.query(`
      SELECT cefr_level, COUNT(*) as count 
      FROM words 
      GROUP BY cefr_level 
      ORDER BY CASE cefr_level 
        WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'B1' THEN 3 
        WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6 END
    `);
    
    console.log('\nCEFR distribution after frequency-based rebalancing:');
    cefrResult.rows.forEach(row => {
      const pct = ((row.count / stats.total) * 100).toFixed(1);
      console.log(`  ${row.cefr_level}: ${parseInt(row.count).toLocaleString()} (${pct}%)`);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  extractFrequencyFromMobile().catch(console.error);
}

module.exports = { extractFrequencyFromMobile };