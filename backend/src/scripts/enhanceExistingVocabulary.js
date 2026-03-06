/**
 * Enhance existing language pairs with additional vocabulary sources
 * 
 * This script helps you:
 * 1. Analyze current vocabulary coverage and gaps
 * 2. Import FreeDict data for existing languages
 * 3. Merge and deduplicate from multiple sources
 * 4. Improve CEFR level distribution
 * 5. Add missing frequency rankings
 * 
 * Usage:
 *   node src/scripts/enhanceExistingVocabulary.js --analyze
 *   node src/scripts/enhanceExistingVocabulary.js --language=fr --source=freedict
 *   node src/scripts/enhanceExistingVocabulary.js --language=all --enhance-levels
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

// Current language mappings
const CURRENT_LANGUAGES = {
  'fr': 'French',
  'de': 'German',  
  'es': 'Spanish',
  'hu': 'Hungarian',
  'pt': 'Portuguese',
  'ru': 'Russian'
};

const FREEDICT_MAPPINGS = {
  'fr': ['eng-fra', 'fra-eng'],
  'de': ['eng-deu', 'deu-eng'], 
  'es': ['eng-spa', 'spa-eng'],
  'hu': ['eng-hun', 'hun-eng'],
  'pt': ['eng-por', 'por-eng'],
  'ru': ['eng-rus', 'rus-eng']
};

async function analyzeCurrent() {
  console.log('📊 Analyzing current vocabulary...\n');
  
  const client = await pool.connect();
  try {
    // Get current word counts by language and level
    const countQuery = `
      SELECT 
        source_lang, 
        target_lang, 
        cefr_level,
        COUNT(*) as count,
        AVG(frequency_rank) as avg_frequency
      FROM words 
      GROUP BY source_lang, target_lang, cefr_level
      ORDER BY source_lang, target_lang, cefr_level
    `;
    
    const result = await client.query(countQuery);
    
    // Organize results by language pair
    const stats = {};
    result.rows.forEach(row => {
      const pair = `${row.source_lang}-${row.target_lang}`;
      if (!stats[pair]) {
        stats[pair] = { total: 0, levels: {}, avgFreq: 0 };
      }
      stats[pair].levels[row.cefr_level] = row.count;
      stats[pair].total += row.count;
      stats[pair].avgFreq = row.avg_frequency;
    });
    
    // Print analysis
    console.log('Current Vocabulary Analysis:');
    console.log('=' .repeat(80));
    
    for (const [pair, data] of Object.entries(stats)) {
      const [source, target] = pair.split('-');
      const langName = CURRENT_LANGUAGES[target] || target;
      
      console.log(`\n${source.toUpperCase()} → ${langName} (${data.total.toLocaleString()} words)`);
      console.log(`Average frequency rank: ${data.avgFreq ? Math.round(data.avgFreq) : 'N/A'}`);
      
      const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      levels.forEach(level => {
        const count = data.levels[level] || 0;
        const percentage = ((count / data.total) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(percentage / 5));
        console.log(`  ${level}: ${count.toString().padStart(6)} (${percentage.padStart(5)}%) ${bar}`);
      });
    }
    
    // Identify gaps and opportunities
    console.log('\n📋 Improvement Opportunities:');
    console.log('=' .repeat(50));
    
    for (const [pair, data] of Object.entries(stats)) {
      const [source, target] = pair.split('-');
      const langName = CURRENT_LANGUAGES[target] || target;
      
      const issues = [];
      
      // Check for level distribution issues
      const a1Count = data.levels['A1'] || 0;
      const c2Count = data.levels['C2'] || 0;
      
      if (a1Count < data.total * 0.15) {
        issues.push('Need more A1 vocabulary');
      }
      if (c2Count > data.total * 0.4) {
        issues.push('Too many C2 words - may need level adjustment');
      }
      if (data.total < 10000) {
        issues.push('Small vocabulary size - good candidate for FreeDict expansion');
      }
      if (!data.avgFreq) {
        issues.push('Missing frequency data');
      }
      
      if (issues.length > 0) {
        console.log(`\n${langName}:`);
        issues.forEach(issue => console.log(`  • ${issue}`));
      }
    }
    
  } finally {
    client.release();
  }
}

async function enhanceWithFreeDict(language) {
  console.log(`🔄 Enhancing ${CURRENT_LANGUAGES[language]} with FreeDict data...\n`);
  
  const { enhancedImport } = require('./enhancedFreeDictImporter');
  
  const langPairs = FREEDICT_MAPPINGS[language];
  if (!langPairs) {
    console.error(`No FreeDict mapping found for language: ${language}`);
    return;
  }
  
  let totalAdded = 0;
  let totalSkipped = 0;
  
  for (const pair of langPairs) {
    console.log(`Importing ${pair}...`);
    try {
      const result = await enhancedImport(pair);
      console.log(`✅ ${pair}: +${result.imported} words, ${result.skipped} skipped`);
      totalAdded += result.imported;
      totalSkipped += result.skipped;
    } catch (error) {
      console.error(`❌ ${pair}: ${error.message}`);
    }
  }
  
  console.log(`\n📈 Enhancement complete for ${CURRENT_LANGUAGES[language]}:`);
  console.log(`   New words added: ${totalAdded.toLocaleString()}`);
  console.log(`   Duplicates/skipped: ${totalSkipped.toLocaleString()}`);
}

async function improveFrequencyData() {
  console.log('🎯 Improving frequency rankings...\n');
  
  const client = await pool.connect();
  try {
    // Load frequency data from your existing files
    const dataDir = path.resolve(__dirname, '../../../data');
    
    for (const [langCode, langName] of Object.entries(CURRENT_LANGUAGES)) {
      console.log(`Processing ${langName}...`);
      
      const langDirName = langName.toLowerCase();
      const langDir = path.join(dataDir, langDirName);
      
      if (fs.existsSync(langDir)) {
        const frequencyMap = new Map();
        
        // Read all frequency files for this language
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
        
        console.log(`  Found ${frequencyMap.size} frequency rankings`);
        
        // Update database with frequency rankings
        let updated = 0;
        const batchSize = 1000;
        const entries = Array.from(frequencyMap.entries());
        
        for (let i = 0; i < entries.length; i += batchSize) {
          const batch = entries.slice(i, i + batchSize);
          
          for (const [word, rank] of batch) {
            const updateQuery = `
              UPDATE words 
              SET frequency_rank = $1 
              WHERE LOWER(word) = $2 
              AND source_lang = 'en' 
              AND target_lang = $3
              AND frequency_rank IS NULL
            `;
            
            const result = await client.query(updateQuery, [rank, word, langCode]);
            updated += result.rowCount;
          }
        }
        
        console.log(`  Updated ${updated} words with frequency rankings`);
      } else {
        console.log(`  No frequency data found for ${langName}`);
      }
    }
    
  } finally {
    client.release();
  }
}

async function rebalanceLevels() {
  console.log('⚖️  Rebalancing CEFR levels based on frequency...\n');
  
  const client = await pool.connect();
  try {
    // Update levels based on frequency rankings
    const queries = [
      // A1: Most frequent 1000 words
      `UPDATE words SET cefr_level = 'A1' 
       WHERE frequency_rank <= 1000 AND frequency_rank IS NOT NULL`,
       
      // A2: Next 1000 words  
      `UPDATE words SET cefr_level = 'A2' 
       WHERE frequency_rank > 1000 AND frequency_rank <= 2000 AND frequency_rank IS NOT NULL`,
       
      // B1: Next 2000 words
      `UPDATE words SET cefr_level = 'B1' 
       WHERE frequency_rank > 2000 AND frequency_rank <= 4000 AND frequency_rank IS NOT NULL`,
       
      // B2: Next 4000 words  
      `UPDATE words SET cefr_level = 'B2' 
       WHERE frequency_rank > 4000 AND frequency_rank <= 8000 AND frequency_rank IS NOT NULL`,
       
      // C1: Next 7000 words
      `UPDATE words SET cefr_level = 'C1' 
       WHERE frequency_rank > 8000 AND frequency_rank <= 15000 AND frequency_rank IS NOT NULL`
      
      // C2: Everything else remains C2
    ];
    
    for (const query of queries) {
      const result = await client.query(query);
      console.log(`Updated ${result.rowCount} words`);
    }
    
  } finally {
    client.release();
  }
}

async function removeDuplicates() {
  console.log('🔍 Removing duplicates and low-quality entries...\n');
  
  const client = await pool.connect();
  try {
    // Remove exact duplicates (keeping the one with better frequency rank)
    const dedupeQuery = `
      WITH duplicates AS (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY LOWER(word), LOWER(translation), source_lang, target_lang 
          ORDER BY 
            CASE WHEN frequency_rank IS NOT NULL THEN 0 ELSE 1 END,
            frequency_rank NULLS LAST,
            id
        ) as rn
        FROM words
      )
      DELETE FROM words WHERE id IN (
        SELECT id FROM duplicates WHERE rn > 1
      )
    `;
    
    const result = await client.query(dedupeQuery);
    console.log(`Removed ${result.rowCount} duplicate entries`);
    
    // Remove very low quality entries
    const cleanupQuery = `
      DELETE FROM words WHERE 
        LENGTH(word) > 100 OR 
        LENGTH(translation) > 200 OR
        word ~ '^[0-9]+$' OR
        translation ~ '^[0-9]+$'
    `;
    
    const cleanResult = await client.query(cleanupQuery);
    console.log(`Removed ${cleanResult.rowCount} low-quality entries`);
    
  } finally {
    client.release();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--analyze')) {
      await analyzeCurrent();
    } else if (args.includes('--enhance-levels')) {
      await improveFrequencyData();
      await rebalanceLevels();
    } else if (args.includes('--cleanup')) {
      await removeDuplicates();
    } else {
      const langArg = args.find(arg => arg.startsWith('--language='));
      const sourceArg = args.find(arg => arg.startsWith('--source='));
      
      if (langArg && sourceArg) {
        const language = langArg.split('=')[1];
        const source = sourceArg.split('=')[1];
        
        if (language === 'all') {
          for (const lang of Object.keys(CURRENT_LANGUAGES)) {
            await enhanceWithFreeDict(lang);
          }
        } else if (CURRENT_LANGUAGES[language]) {
          if (source === 'freedict') {
            await enhanceWithFreeDict(language);
          }
        } else {
          console.error(`Unknown language: ${language}`);
        }
      } else {
        console.log('Usage:');
        console.log('  --analyze                           Show current vocabulary analysis');
        console.log('  --language=fr --source=freedict     Add FreeDict data for French');
        console.log('  --language=all --source=freedict    Add FreeDict data for all languages');
        console.log('  --enhance-levels                    Improve CEFR levels using frequency');
        console.log('  --cleanup                           Remove duplicates and low-quality entries');
      }
    }
  } catch (error) {
    console.error('Enhancement failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  analyzeCurrent, 
  enhanceWithFreeDict, 
  improveFrequencyData,
  rebalanceLevels,
  removeDuplicates 
};