/**
 * Next Phase Vocabulary Enhancements
 * 
 * Based on the analysis, we can now:
 * 1. Add frequency rankings to improve CEFR accuracy
 * 2. Add specialized vocabulary categories
 * 3. Improve level distribution balance
 * 4. Add contextual examples and usage notes
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const FREQUENCY_LISTS = {
  en: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt',
  es: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt',
  fr: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt',
  de: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt'
};

async function enhanceWithFrequencyData() {
  console.log('🎯 ADDING FREQUENCY RANKINGS');
  console.log('=' .repeat(40));
  
  const client = await pool.connect();
  
  try {
    // First, let's use the existing frequency data from your /data folder
    const dataDir = path.resolve(__dirname, '../../../data/content/2016');
    
    const languageDirs = {
      'fr': 'fr',
      'de': 'de',
      'es': 'es',
      'hu': 'hu',
      'pt': 'pt',
      'ru': 'ru'
    };
    
    for (const [langCode, dirName] of Object.entries(languageDirs)) {
      console.log(`\n📚 Processing ${dirName} frequency data...`);
      
      const langDir = path.join(dataDir, dirName);
      if (!fs.existsSync(langDir)) {
        console.log(`  ⏭️  Directory not found: ${langDir}`);
        continue;
      }
      
      const frequencyMap = new Map();
      const files = fs.readdirSync(langDir).filter(f => f.endsWith('.txt'));
      
      for (const file of files) {
        const content = fs.readFileSync(path.join(langDir, file), 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const word = line.trim().toLowerCase();
          if (word && !frequencyMap.has(word)) {
            frequencyMap.set(word, index + 1);
          }
        });
      }
      
      console.log(`  Found ${frequencyMap.size.toLocaleString()} frequency entries`);
      
      // Update words with frequency rankings
      let updated = 0;
      const entries = Array.from(frequencyMap.entries());
      
      for (let i = 0; i < entries.length; i += 1000) {
        const batch = entries.slice(i, i + 1000);
        
        for (const [word, rank] of batch) {
          // Update English to target language
          const updateQuery1 = `
            UPDATE words 
            SET frequency_rank = $1 
            WHERE LOWER(word) = $2 
            AND source_lang = 'en' 
            AND target_lang = $3
            AND frequency_rank IS NULL
          `;
          
          const result1 = await client.query(updateQuery1, [rank, word, langCode]);
          updated += result1.rowCount;
          
          // Update target language to English
          const updateQuery2 = `
            UPDATE words 
            SET frequency_rank = $1 
            WHERE LOWER(translation) = $2 
            AND source_lang = $3 
            AND target_lang = 'en'
            AND frequency_rank IS NULL
          `;
          
          const result2 = await client.query(updateQuery2, [rank, word, langCode]);
          updated += result2.rowCount;
        }
      }
      
      console.log(`  Updated ${updated.toLocaleString()} words with frequency rankings`);
    }
    
  } finally {
    client.release();
  }
}

async function rebalanceCEFRLevels() {
  console.log('\n⚖️  REBALANCING CEFR LEVELS');
  console.log('=' .repeat(40));
  
  const client = await pool.connect();
  
  try {
    // Rebalance based on frequency rankings where available
    const rebalanceQueries = [
      {
        level: 'A1',
        query: `UPDATE words SET cefr_level = 'A1' WHERE frequency_rank <= 1000 AND frequency_rank IS NOT NULL`,
        description: 'Most frequent 1000 words → A1'
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
    
  } finally {
    client.release();
  }
}

async function addSpecializedCategories() {
  console.log('\n🏷️  ADDING SPECIALIZED CATEGORIES');
  console.log('=' .repeat(40));
  
  const client = await pool.connect();
  
  try {
    const categories = [
      {
        name: 'business',
        patterns: ['business', 'company', 'market', 'profit', 'invest', 'manage', 'office', 'meeting', 'contract', 'client', 'customer', 'sale', 'revenue', 'budget', 'finance', 'economy', 'trade', 'commerce', 'industry', 'corporate'],
        description: 'Business and commerce vocabulary'
      },
      {
        name: 'science',
        patterns: ['science', 'research', 'experiment', 'theory', 'hypothesis', 'analysis', 'method', 'result', 'data', 'study', 'biology', 'chemistry', 'physics', 'mathematics', 'laboratory', 'scientific', 'molecular', 'atomic', 'chemical', 'biological'],
        description: 'Science and research vocabulary'
      },
      {
        name: 'medical',
        patterns: ['medical', 'health', 'doctor', 'hospital', 'medicine', 'treatment', 'patient', 'disease', 'symptom', 'diagnosis', 'therapy', 'surgery', 'clinic', 'pharmaceutical', 'medication', 'physician', 'nurse', 'anatomical', 'physiological', 'pathological'],
        description: 'Medical and health vocabulary'
      },
      {
        name: 'technology',
        patterns: ['computer', 'software', 'digital', 'internet', 'website', 'database', 'program', 'system', 'network', 'technology', 'electronic', 'technical', 'algorithm', 'application', 'interface', 'server', 'device', 'smartphone', 'technological', 'cyber'],
        description: 'Technology and computing vocabulary'
      },
      {
        name: 'academic',
        patterns: ['university', 'academic', 'education', 'student', 'professor', 'research', 'study', 'course', 'degree', 'thesis', 'lecture', 'seminar', 'scholarship', 'examination', 'curriculum', 'pedagogical', 'scholarly', 'intellectual', 'theoretical', 'analytical'],
        description: 'Academic and educational vocabulary'
      }
    ];
    
    for (const category of categories) {
      console.log(`\n  ${category.name.toUpperCase()}: ${category.description}`);
      
      let totalUpdated = 0;
      
      for (const pattern of category.patterns) {
        // Update words containing these patterns
        const updateQuery = `
          UPDATE words 
          SET category = $1 
          WHERE (LOWER(word) LIKE $2 OR LOWER(translation) LIKE $2)
          AND category = 'dictionary_mined'
        `;
        
        const result = await client.query(updateQuery, [category.name, `%${pattern}%`]);
        totalUpdated += result.rowCount;
      }
      
      console.log(`    Updated ${totalUpdated.toLocaleString()} words`);
    }
    
  } finally {
    client.release();
  }
}

async function addContextualExamples() {
  console.log('\n💬 ADDING CONTEXTUAL EXAMPLES');
  console.log('=' .repeat(40));
  
  const client = await pool.connect();
  
  try {
    // Add example_sentence column if it doesn't exist
    await client.query(`
      ALTER TABLE words 
      ADD COLUMN IF NOT EXISTS example_sentence TEXT,
      ADD COLUMN IF NOT EXISTS example_translation TEXT
    `);
    
    console.log('  ✅ Added example sentence columns');
    
    // For now, just mark high-priority words that need examples
    const priorityQuery = `
      UPDATE words 
      SET category = category || '_priority'
      WHERE frequency_rank <= 5000 
      AND frequency_rank IS NOT NULL
      AND cefr_level IN ('A1', 'A2', 'B1')
      AND example_sentence IS NULL
    `;
    
    const result = await client.query(priorityQuery);
    console.log(`  📝 Marked ${result.rowCount.toLocaleString()} high-priority words for example sentences`);
    
  } finally {
    client.release();
  }
}

async function generateProgressReport() {
  console.log('\n📊 ENHANCEMENT PROGRESS REPORT');
  console.log('=' .repeat(50));
  
  const client = await pool.connect();
  
  try {
    // Overall statistics
    const totalResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN frequency_rank IS NOT NULL THEN 1 END) as with_frequency,
        COUNT(CASE WHEN category != 'dictionary_mined' AND category != 'general' THEN 1 END) as specialized,
        COUNT(CASE WHEN example_sentence IS NOT NULL THEN 1 END) as with_examples
      FROM words
    `);
    
    const stats = totalResult.rows[0];
    console.log(`Total vocabulary: ${parseInt(stats.total).toLocaleString()}`);
    console.log(`With frequency data: ${parseInt(stats.with_frequency).toLocaleString()} (${((stats.with_frequency/stats.total)*100).toFixed(1)}%)`);
    console.log(`Specialized categories: ${parseInt(stats.specialized).toLocaleString()} (${((stats.specialized/stats.total)*100).toFixed(1)}%)`);
    console.log(`With examples: ${parseInt(stats.with_examples).toLocaleString()} (${((stats.with_examples/stats.total)*100).toFixed(1)}%)`);
    
    // Category breakdown
    const categoryResult = await client.query(`
      SELECT category, COUNT(*) as count 
      FROM words 
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    console.log('\nTop categories:');
    categoryResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${parseInt(row.count).toLocaleString()}`);
    });
    
    // CEFR after rebalancing
    const cefrResult = await client.query(`
      SELECT cefr_level, COUNT(*) as count 
      FROM words 
      GROUP BY cefr_level 
      ORDER BY CASE cefr_level 
        WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'B1' THEN 3 
        WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6 END
    `);
    
    console.log('\nCEFR distribution after rebalancing:');
    cefrResult.rows.forEach(row => {
      const pct = ((row.count / stats.total) * 100).toFixed(1);
      console.log(`  ${row.cefr_level}: ${parseInt(row.count).toLocaleString()} (${pct}%)`);
    });
    
  } finally {
    client.release();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--frequency')) {
      await enhanceWithFrequencyData();
    } else if (args.includes('--rebalance')) {
      await rebalanceCEFRLevels();
    } else if (args.includes('--categories')) {
      await addSpecializedCategories();
    } else if (args.includes('--examples')) {
      await addContextualExamples();
    } else if (args.includes('--report')) {
      await generateProgressReport();
    } else if (args.includes('--all')) {
      console.log('🚀 COMPREHENSIVE VOCABULARY ENHANCEMENT');
      console.log('=' .repeat(50));
      
      await enhanceWithFrequencyData();
      await rebalanceCEFRLevels();
      await addSpecializedCategories();
      await addContextualExamples();
      await generateProgressReport();
      
      console.log('\n🎉 ALL ENHANCEMENTS COMPLETE!');
      
    } else {
      console.log('🎯 NEXT PHASE ENHANCEMENTS');
      console.log('==========================');
      console.log('');
      console.log('Available enhancements:');
      console.log('  --frequency    Add frequency rankings for better CEFR accuracy');
      console.log('  --rebalance    Rebalance CEFR levels based on frequency');
      console.log('  --categories   Add specialized vocabulary categories');
      console.log('  --examples     Prepare for contextual examples');
      console.log('  --report       Generate progress report');
      console.log('  --all          Run all enhancements');
      console.log('');
      console.log('Current status: 856k+ words with 85% new content');
    }
    
  } catch (error) {
    console.error('\n💥 Enhancement failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  enhanceWithFrequencyData, 
  rebalanceCEFRLevels, 
  addSpecializedCategories,
  addContextualExamples,
  generateProgressReport 
};