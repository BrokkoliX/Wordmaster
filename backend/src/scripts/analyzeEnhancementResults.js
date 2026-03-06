/**
 * Analyze the vocabulary enhancement results and provide insights
 * 
 * This script analyzes:
 * 1. CEFR level distribution of new vocabulary
 * 2. Category breakdown and quality metrics
 * 3. Language pair completeness
 * 4. Identifies remaining gaps and opportunities
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function analyzeResults() {
  const client = await pool.connect();
  
  try {
    console.log('📊 VOCABULARY ENHANCEMENT ANALYSIS');
    console.log('=' .repeat(60));
    
    // Overall statistics
    await analyzeOverallStats(client);
    
    // CEFR distribution
    await analyzeCEFRDistribution(client);
    
    // Language pair analysis
    await analyzeLanguagePairs(client);
    
    // Category breakdown
    await analyzeCategoryBreakdown(client);
    
    // Quality metrics
    await analyzeQualityMetrics(client);
    
    // Recommendations
    await generateRecommendations(client);
    
  } finally {
    client.release();
    await pool.end();
  }
}

async function analyzeOverallStats(client) {
  console.log('\n📈 OVERALL VOCABULARY STATISTICS');
  console.log('-'.repeat(40));
  
  const totalQuery = `
    SELECT 
      COUNT(*) as total_words,
      COUNT(DISTINCT source_lang || '-' || target_lang) as language_pairs,
      COUNT(DISTINCT category) as categories,
      AVG(CASE WHEN frequency_rank IS NOT NULL THEN frequency_rank END) as avg_frequency
    FROM words
  `;
  
  const totalResult = await client.query(totalQuery);
  const stats = totalResult.rows[0];
  
  console.log(`Total vocabulary: ${parseInt(stats.total_words).toLocaleString()} words`);
  console.log(`Language pairs: ${stats.language_pairs}`);
  console.log(`Categories: ${stats.categories}`);
  console.log(`Average frequency rank: ${stats.avg_frequency ? Math.round(stats.avg_frequency).toLocaleString() : 'N/A'}`);
  
  // New vs existing breakdown
  const categoryQuery = `
    SELECT 
      category,
      COUNT(*) as word_count,
      ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM words)), 2) as percentage
    FROM words 
    GROUP BY category 
    ORDER BY word_count DESC
  `;
  
  const categoryResult = await client.query(categoryQuery);
  
  console.log('\nSource breakdown:');
  categoryResult.rows.forEach(row => {
    console.log(`  ${row.category}: ${parseInt(row.word_count).toLocaleString()} (${row.percentage}%)`);
  });
}

async function analyzeCEFRDistribution(client) {
  console.log('\n🎯 CEFR LEVEL DISTRIBUTION');
  console.log('-'.repeat(40));
  
  const cefrQuery = `
    SELECT 
      cefr_level,
      COUNT(*) as word_count,
      ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM words)), 2) as percentage
    FROM words 
    GROUP BY cefr_level 
    ORDER BY 
      CASE cefr_level 
        WHEN 'A1' THEN 1 
        WHEN 'A2' THEN 2 
        WHEN 'B1' THEN 3 
        WHEN 'B2' THEN 4 
        WHEN 'C1' THEN 5 
        WHEN 'C2' THEN 6 
      END
  `;
  
  const cefrResult = await client.query(cefrQuery);
  
  cefrResult.rows.forEach(row => {
    const bar = '█'.repeat(Math.round(row.percentage / 3));
    console.log(`  ${row.cefr_level}: ${parseInt(row.word_count).toLocaleString().padStart(8)} (${row.percentage.toString().padStart(5)}%) ${bar}`);
  });
  
  // Analyze distribution by language
  console.log('\nCEFR distribution by target language:');
  
  const langCefrQuery = `
    SELECT 
      target_lang,
      cefr_level,
      COUNT(*) as word_count
    FROM words 
    WHERE source_lang = 'en'
    GROUP BY target_lang, cefr_level 
    ORDER BY target_lang, 
      CASE cefr_level 
        WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'B1' THEN 3 
        WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6 
      END
  `;
  
  const langCefrResult = await client.query(langCefrQuery);
  
  const languages = {};
  langCefrResult.rows.forEach(row => {
    if (!languages[row.target_lang]) {
      languages[row.target_lang] = {};
    }
    languages[row.target_lang][row.cefr_level] = parseInt(row.word_count);
  });
  
  Object.entries(languages).forEach(([lang, levels]) => {
    const total = Object.values(levels).reduce((a, b) => a + b, 0);
    console.log(`\n  ${lang.toUpperCase()}: ${total.toLocaleString()} total words`);
    ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].forEach(level => {
      const count = levels[level] || 0;
      const pct = ((count / total) * 100).toFixed(1);
      console.log(`    ${level}: ${count.toString().padStart(6)} (${pct.padStart(4)}%)`);
    });
  });
}

async function analyzeLanguagePairs(client) {
  console.log('\n🌍 LANGUAGE PAIR ANALYSIS');
  console.log('-'.repeat(40));
  
  const pairQuery = `
    SELECT 
      source_lang,
      target_lang,
      COUNT(*) as word_count,
      COUNT(DISTINCT category) as source_categories,
      AVG(CASE WHEN frequency_rank IS NOT NULL THEN frequency_rank END) as avg_frequency
    FROM words 
    GROUP BY source_lang, target_lang 
    ORDER BY word_count DESC
  `;
  
  const pairResult = await client.query(pairQuery);
  
  console.log('Language pairs by vocabulary size:');
  pairResult.rows.forEach(row => {
    const freqStr = row.avg_frequency ? `freq: ${Math.round(row.avg_frequency)}` : 'no freq data';
    console.log(`  ${row.source_lang} → ${row.target_lang}: ${parseInt(row.word_count).toLocaleString()} words (${row.source_categories} sources, ${freqStr})`);
  });
}

async function analyzeCategoryBreakdown(client) {
  console.log('\n📚 CATEGORY ANALYSIS');
  console.log('-'.repeat(40));
  
  const categoryDetailsQuery = `
    SELECT 
      category,
      source_lang,
      target_lang,
      COUNT(*) as word_count,
      MIN(LENGTH(word)) as min_word_length,
      MAX(LENGTH(word)) as max_word_length,
      AVG(LENGTH(word)) as avg_word_length,
      MIN(LENGTH(translation)) as min_translation_length,
      MAX(LENGTH(translation)) as max_translation_length,
      AVG(LENGTH(translation)) as avg_translation_length
    FROM words 
    GROUP BY category, source_lang, target_lang 
    HAVING COUNT(*) > 1000
    ORDER BY category, word_count DESC
  `;
  
  const categoryResult = await client.query(categoryDetailsQuery);
  
  let currentCategory = null;
  categoryResult.rows.forEach(row => {
    if (row.category !== currentCategory) {
      console.log(`\n${row.category.toUpperCase()}:`);
      currentCategory = row.category;
    }
    
    console.log(`  ${row.source_lang}→${row.target_lang}: ${parseInt(row.word_count).toLocaleString()} words`);
    console.log(`    Word length: ${row.min_word_length}-${row.max_word_length} (avg: ${Math.round(row.avg_word_length)})`);
    console.log(`    Translation length: ${row.min_translation_length}-${row.max_translation_length} (avg: ${Math.round(row.avg_translation_length)})`);
  });
}

async function analyzeQualityMetrics(client) {
  console.log('\n✨ QUALITY METRICS');
  console.log('-'.repeat(40));
  
  // Check for potential quality issues
  const qualityChecks = [
    {
      name: 'Very short words (1 char)',
      query: `SELECT COUNT(*) as count FROM words WHERE LENGTH(word) = 1`
    },
    {
      name: 'Very long words (>30 chars)', 
      query: `SELECT COUNT(*) as count FROM words WHERE LENGTH(word) > 30`
    },
    {
      name: 'Very long translations (>100 chars)',
      query: `SELECT COUNT(*) as count FROM words WHERE LENGTH(translation) > 100`
    },
    {
      name: 'Words with numbers',
      query: `SELECT COUNT(*) as count FROM words WHERE word ~ '[0-9]'`
    },
    {
      name: 'Words with special characters',
      query: `SELECT COUNT(*) as count FROM words WHERE word ~ '[^a-zA-ZÀ-ÿ\\s\\-'']'`
    },
    {
      name: 'Potential duplicates (same word+translation)',
      query: `SELECT COUNT(*) - COUNT(DISTINCT word, translation, source_lang, target_lang) as count FROM words`
    }
  ];
  
  for (const check of qualityChecks) {
    const result = await client.query(check.query);
    const count = parseInt(result.rows[0].count);
    const status = count === 0 ? '✅' : count < 100 ? '⚠️ ' : '❌';
    console.log(`${status} ${check.name}: ${count.toLocaleString()}`);
  }
  
  // Sample random entries for manual review
  console.log('\nRandom sample for quality review:');
  const sampleQuery = `
    SELECT word, translation, source_lang, target_lang, category, cefr_level
    FROM words 
    WHERE category = 'dictionary_mined'
    ORDER BY RANDOM() 
    LIMIT 5
  `;
  
  const sampleResult = await client.query(sampleQuery);
  sampleResult.rows.forEach((row, i) => {
    console.log(`  ${i+1}. ${row.source_lang}→${row.target_lang}: "${row.word}" → "${row.translation}" (${row.cefr_level})`);
  });
}

async function generateRecommendations(client) {
  console.log('\n💡 ENHANCEMENT RECOMMENDATIONS');
  console.log('-'.repeat(40));
  
  // Check for imbalanced distributions
  const imbalanceQuery = `
    SELECT 
      target_lang,
      COUNT(*) as total_words,
      COUNT(CASE WHEN cefr_level IN ('A1', 'A2') THEN 1 END) as beginner_words,
      COUNT(CASE WHEN cefr_level IN ('C1', 'C2') THEN 1 END) as advanced_words,
      COUNT(CASE WHEN frequency_rank IS NOT NULL THEN 1 END) as words_with_frequency
    FROM words 
    WHERE source_lang = 'en'
    GROUP BY target_lang
    ORDER BY total_words DESC
  `;
  
  const imbalanceResult = await client.query(imbalanceQuery);
  
  console.log('Potential improvements by language:');
  
  imbalanceResult.rows.forEach(row => {
    const beginnerPct = (row.beginner_words / row.total_words * 100).toFixed(1);
    const advancedPct = (row.advanced_words / row.total_words * 100).toFixed(1);
    const freqPct = (row.words_with_frequency / row.total_words * 100).toFixed(1);
    
    console.log(`\n${row.target_lang.toUpperCase()}:`);
    console.log(`  Total vocabulary: ${parseInt(row.total_words).toLocaleString()}`);
    console.log(`  Beginner level: ${beginnerPct}% (target: 30-40%)`);
    console.log(`  Advanced level: ${advancedPct}% (target: 20-30%)`);
    console.log(`  Has frequency data: ${freqPct}%`);
    
    const recommendations = [];
    if (parseFloat(beginnerPct) < 25) {
      recommendations.push('Add more A1/A2 vocabulary');
    }
    if (parseFloat(advancedPct) > 40) {
      recommendations.push('Balance with more beginner words');
    }
    if (parseFloat(freqPct) < 50) {
      recommendations.push('Add frequency rankings for better CEFR assignment');
    }
    if (parseInt(row.total_words) < 100000) {
      recommendations.push('Consider adding more vocabulary sources');
    }
    
    if (recommendations.length > 0) {
      console.log(`  Recommendations: ${recommendations.join(', ')}`);
    } else {
      console.log(`  Status: Well balanced ✅`);
    }
  });
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Add frequency rankings to improve CEFR level accuracy');
  console.log('2. Consider adding specialized vocabulary categories (business, science, etc.)');
  console.log('3. Implement quality validation with native speaker review');
  console.log('4. Add pronunciation data and audio for enhanced learning');
  console.log('5. Consider adding example sentences for context');
}

if (require.main === module) {
  analyzeResults().catch(console.error);
}

module.exports = { analyzeResults };