/**
 * Identify and remove remaining grammatical entries that escaped initial filtering
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function identifyGrammaticalEntries() {
  console.log('🔍 IDENTIFYING REMAINING GRAMMATICAL ENTRIES');
  console.log('=' .repeat(60));
  
  const client = await pool.connect();
  
  try {
    // Enhanced grammatical patterns that might have escaped
    const grammaticalPatterns = [
      // Verb forms
      'infinitive of',
      'past tense of',
      'present tense of',
      'future tense of',
      'subjunctive of',
      'imperative of',
      'gerund of',
      'participle of',
      'conjugation of',
      'conjugated form of',
      
      // Noun forms
      'plural of',
      'singular of',
      'feminine of',
      'masculine of',
      'neuter of',
      'diminutive of',
      'augmentative of',
      
      // Cases
      'nominative of',
      'genitive of',
      'accusative of',
      'dative of',
      'ablative of',
      'vocative of',
      'instrumental of',
      'locative of',
      
      // General forms
      'inflection of',
      'declension of',
      'form of',
      'alternative form of',
      'variant of',
      'archaic form of',
      'obsolete form of',
      
      // Comparative/superlative
      'comparative of',
      'superlative of',
      'comparative form of',
      'superlative form of',
      
      // Contractions and abbreviations
      'contraction of',
      'abbreviation of',
      'acronym of',
      'initialism of',
      'short form of',
      
      // Language-specific
      'romanization of',
      'transliteration of',
      'pronunciation spelling of',
      
      // Letters and alphabets
      'letter of the',
      'letter in the',
      'character in the',
      'symbol for',
      
      // Ordinal numbers
      'first letter of',
      'second letter of',
      'third letter of',
      'last letter of'
    ];
    
    console.log('\n📊 SCANNING FOR GRAMMATICAL PATTERNS...');
    
    let totalFound = 0;
    const foundPatterns = {};
    
    for (const pattern of grammaticalPatterns) {
      const result = await client.query(`
        SELECT COUNT(*) as count, array_agg(DISTINCT word LIMIT 5) as examples
        FROM words 
        WHERE LOWER(translation) LIKE $1
        OR LOWER(word) LIKE $1
      `, [`%${pattern.toLowerCase()}%`]);
      
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        totalFound += count;
        foundPatterns[pattern] = {
          count,
          examples: result.rows[0].examples || []
        };
        console.log(`  ❌ "${pattern}": ${count.toLocaleString()} entries`);
        console.log(`     Examples: ${result.rows[0].examples.slice(0, 3).join(', ')}`);
      }
    }
    
    // Check for entries that start with grammatical indicators
    console.log('\n🔍 SCANNING FOR GRAMMATICAL BEGINNINGS...');
    
    const grammaticalStarters = [
      'used to',
      'refers to',
      'indicates',
      'denotes',
      'expresses',
      'represents',
      'symbol used',
      'term used',
      'word used',
      'expression used',
      'phrase used',
      'one who',
      'someone who',
      'something that',
      'that which',
      'the act of',
      'the process of',
      'the state of',
      'the condition of'
    ];
    
    for (const starter of grammaticalStarters) {
      const result = await client.query(`
        SELECT COUNT(*) as count, array_agg(DISTINCT translation LIMIT 3) as examples
        FROM words 
        WHERE LOWER(translation) LIKE $1
      `, [`${starter.toLowerCase()}%`]);
      
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        totalFound += count;
        foundPatterns[`starts_with_${starter}`] = {
          count,
          examples: result.rows[0].examples || []
        };
        console.log(`  ❌ "^${starter}": ${count.toLocaleString()} entries`);
      }
    }
    
    // Check for very long translations (likely explanations)
    const longTranslations = await client.query(`
      SELECT COUNT(*) as count
      FROM words 
      WHERE LENGTH(translation) > 50
    `);
    
    if (parseInt(longTranslations.rows[0].count) > 0) {
      console.log(`  ❌ Long translations (>50 chars): ${parseInt(longTranslations.rows[0].count).toLocaleString()} entries`);
      totalFound += parseInt(longTranslations.rows[0].count);
    }
    
    // Check for entries with multiple slashes (likely alternatives/explanations)
    const multipleSlashes = await client.query(`
      SELECT COUNT(*) as count
      FROM words 
      WHERE (LENGTH(translation) - LENGTH(REPLACE(translation, '/', ''))) > 2
    `);
    
    if (parseInt(multipleSlashes.rows[0].count) > 0) {
      console.log(`  ❌ Multiple slashes (>2): ${parseInt(multipleSlashes.rows[0].count).toLocaleString()} entries`);
      totalFound += parseInt(multipleSlashes.rows[0].count);
    }
    
    console.log(`\n📊 TOTAL GRAMMATICAL ENTRIES FOUND: ${totalFound.toLocaleString()}`);
    
    if (totalFound > 0) {
      console.log('\n⚠️  RECOMMENDATION: Run cleanup to remove these entries');
      return { totalFound, patterns: foundPatterns };
    } else {
      console.log('\n✅ No grammatical entries found!');
      return { totalFound: 0, patterns: {} };
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  identifyGrammaticalEntries().catch(console.error);
}

module.exports = { identifyGrammaticalEntries };