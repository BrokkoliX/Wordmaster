/**
 * Add semantic word relationships to enhance vocabulary learning
 * 
 * This script creates:
 * 1. Synonyms and antonyms for vocabulary expansion
 * 2. Collocations for natural language usage
 * 3. Word families (morphological relationships)
 * 4. Semantic networks for advanced learning
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

// Predefined word relationships for common vocabulary
const WORD_RELATIONSHIPS = {
  synonyms: {
    'good': ['excellent', 'great', 'fine', 'wonderful', 'nice'],
    'bad': ['awful', 'terrible', 'horrible', 'poor', 'wrong'],
    'big': ['large', 'huge', 'enormous', 'giant', 'massive'],
    'small': ['tiny', 'little', 'mini', 'compact', 'minor'],
    'happy': ['joyful', 'cheerful', 'glad', 'pleased', 'delighted'],
    'sad': ['unhappy', 'miserable', 'depressed', 'gloomy', 'upset'],
    'beautiful': ['pretty', 'lovely', 'attractive', 'gorgeous', 'stunning'],
    'ugly': ['hideous', 'unattractive', 'horrible', 'disgusting'],
    'fast': ['quick', 'rapid', 'swift', 'speedy', 'hasty'],
    'slow': ['sluggish', 'gradual', 'leisurely', 'delayed']
  },
  
  antonyms: {
    'good': ['bad', 'awful', 'terrible', 'horrible'],
    'big': ['small', 'tiny', 'little', 'mini'],
    'happy': ['sad', 'unhappy', 'miserable', 'depressed'],
    'hot': ['cold', 'freezing', 'cool', 'chilly'],
    'fast': ['slow', 'sluggish', 'gradual'],
    'easy': ['difficult', 'hard', 'tough', 'challenging'],
    'new': ['old', 'ancient', 'vintage', 'aged'],
    'light': ['dark', 'heavy', 'thick'],
    'high': ['low', 'short', 'deep'],
    'rich': ['poor', 'broke', 'needy']
  },
  
  collocations: {
    'make': ['decision', 'mistake', 'money', 'progress', 'appointment', 'effort'],
    'do': ['homework', 'business', 'exercise', 'research', 'favor'],
    'take': ['time', 'break', 'photo', 'medicine', 'care', 'shower'],
    'get': ['job', 'married', 'tired', 'angry', 'better', 'worse'],
    'have': ['breakfast', 'lunch', 'dinner', 'meeting', 'conversation', 'problem'],
    'give': ['advice', 'information', 'permission', 'presentation', 'speech'],
    'strong': ['coffee', 'wind', 'feeling', 'argument', 'relationship'],
    'heavy': ['rain', 'traffic', 'bag', 'responsibility', 'smoker']
  },
  
  word_families: {
    'happy': ['happiness', 'happily', 'unhappy', 'unhappiness'],
    'beautiful': ['beauty', 'beautifully', 'beautify', 'beautician'],
    'strong': ['strength', 'strongly', 'strengthen', 'stronger'],
    'quick': ['quickly', 'quickness', 'quicken', 'quicker'],
    'easy': ['easily', 'ease', 'easier', 'easiest'],
    'important': ['importance', 'importantly', 'unimportant'],
    'create': ['creation', 'creative', 'creativity', 'creator', 'created'],
    'develop': ['development', 'developer', 'developed', 'developing'],
    'educate': ['education', 'educational', 'educator', 'educated'],
    'organize': ['organization', 'organizer', 'organized', 'organizational']
  }
};

async function addWordRelationships() {
  console.log('🔗 ADDING SEMANTIC WORD RELATIONSHIPS');
  console.log('=' .repeat(60));
  
  const client = await pool.connect();
  
  try {
    // Step 1: Create relationships schema
    await setupRelationshipsSchema(client);
    
    // Step 2: Add predefined relationships
    await addPredefinedRelationships(client);
    
    // Step 3: Generate automatic relationships based on patterns
    await generateAutomaticRelationships(client);
    
    // Step 4: Create semantic network metrics
    await calculateSemanticMetrics(client);
    
    // Step 5: Generate relationships summary
    await generateRelationshipsSummary(client);
    
  } finally {
    client.release();
    await pool.end();
  }
}

async function setupRelationshipsSchema(client) {
  console.log('\n📋 Setting up word relationships database schema...');
  
  const schemaQueries = [
    // Main relationships table
    `CREATE TABLE IF NOT EXISTS word_relationships (
      id SERIAL PRIMARY KEY,
      word_id VARCHAR(100) REFERENCES words(id) ON DELETE CASCADE,
      related_word_id VARCHAR(100) REFERENCES words(id) ON DELETE CASCADE,
      relationship_type VARCHAR(50) NOT NULL,
      strength FLOAT DEFAULT 1.0,
      language_code VARCHAR(10),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(word_id, related_word_id, relationship_type)
    )`,
    
    // Relationship metadata table
    `CREATE TABLE IF NOT EXISTS relationship_metadata (
      id SERIAL PRIMARY KEY,
      relationship_type VARCHAR(50) NOT NULL,
      description TEXT,
      learning_benefit TEXT,
      example_usage TEXT,
      priority INTEGER DEFAULT 1
    )`,
    
    // Semantic clusters table for advanced groupings
    `CREATE TABLE IF NOT EXISTS semantic_clusters (
      id SERIAL PRIMARY KEY,
      cluster_name VARCHAR(100),
      theme VARCHAR(50),
      cefr_level VARCHAR(10),
      word_ids TEXT[], -- Array of word IDs in this cluster
      cluster_strength FLOAT DEFAULT 1.0
    )`,
    
    // Indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_relationships_word ON word_relationships(word_id)`,
    `CREATE INDEX IF NOT EXISTS idx_relationships_related ON word_relationships(related_word_id)`,
    `CREATE INDEX IF NOT EXISTS idx_relationships_type ON word_relationships(relationship_type)`,
    `CREATE INDEX IF NOT EXISTS idx_relationships_strength ON word_relationships(strength DESC)`,
    
    // Add relationship count to words table
    `ALTER TABLE words ADD COLUMN IF NOT EXISTS relationship_count INTEGER DEFAULT 0`
  ];
  
  for (const query of schemaQueries) {
    await client.query(query);
  }
  
  // Insert relationship metadata
  await insertRelationshipMetadata(client);
  
  console.log('  ✅ Word relationships schema setup complete');
}

async function insertRelationshipMetadata(client) {
  const metadata = [
    {
      type: 'synonym',
      description: 'Words with similar or identical meanings',
      benefit: 'Vocabulary expansion and nuanced expression',
      example: 'happy → joyful, glad, cheerful'
    },
    {
      type: 'antonym', 
      description: 'Words with opposite meanings',
      benefit: 'Contrast learning and concept reinforcement',
      example: 'hot → cold, big → small'
    },
    {
      type: 'collocation',
      description: 'Words that commonly appear together',
      benefit: 'Natural language usage and fluency',
      example: 'make → decision, take → photo'
    },
    {
      type: 'word_family',
      description: 'Morphologically related words',
      benefit: 'Pattern recognition and vocabulary multiplication',
      example: 'happy → happiness, happily, unhappy'
    },
    {
      type: 'semantic_cluster',
      description: 'Thematically related vocabulary',
      benefit: 'Contextual learning and memory association',
      example: 'kitchen → cook, food, recipe, ingredient'
    }
  ];
  
  for (const meta of metadata) {
    await client.query(`
      INSERT INTO relationship_metadata (relationship_type, description, learning_benefit, example_usage)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [meta.type, meta.description, meta.benefit, meta.example]);
  }
}

async function addPredefinedRelationships(client) {
  console.log('\n🎯 Adding predefined word relationships...');
  
  let totalRelationships = 0;
  
  // Process each relationship type
  for (const [relType, relationships] of Object.entries(WORD_RELATIONSHIPS)) {
    console.log(`\n  📚 Processing ${relType}...`);
    
    let typeCount = 0;
    
    for (const [baseWord, relatedWords] of Object.entries(relationships)) {
      // Get base word ID from database
      const baseWordResult = await client.query(`
        SELECT id, target_lang FROM words 
        WHERE LOWER(word) = $1 
        AND source_lang = 'en'
        LIMIT 1
      `, [baseWord.toLowerCase()]);
      
      if (baseWordResult.rows.length === 0) continue;
      
      const baseWordId = baseWordResult.rows[0].id;
      const languageCode = baseWordResult.rows[0].target_lang;
      
      // Add relationships to related words
      for (const relatedWord of relatedWords) {
        const relatedResult = await client.query(`
          SELECT id FROM words 
          WHERE LOWER(word) = $1 
          AND source_lang = 'en'
          AND target_lang = $2
          LIMIT 1
        `, [relatedWord.toLowerCase(), languageCode]);
        
        if (relatedResult.rows.length === 0) continue;
        
        const relatedWordId = relatedResult.rows[0].id;
        
        // Calculate relationship strength based on frequency
        const strength = calculateRelationshipStrength(baseWord, relatedWord, relType);
        
        // Insert bidirectional relationship
        await client.query(`
          INSERT INTO word_relationships (word_id, related_word_id, relationship_type, strength, language_code)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (word_id, related_word_id, relationship_type) DO NOTHING
        `, [baseWordId, relatedWordId, relType, strength, languageCode]);
        
        // Add reverse relationship for synonyms and antonyms
        if (relType === 'synonym' || relType === 'antonym') {
          await client.query(`
            INSERT INTO word_relationships (word_id, related_word_id, relationship_type, strength, language_code)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (word_id, related_word_id, relationship_type) DO NOTHING
          `, [relatedWordId, baseWordId, relType, strength, languageCode]);
        }
        
        typeCount++;
      }
    }
    
    console.log(`    ✅ Added ${typeCount} ${relType} relationships`);
    totalRelationships += typeCount;
  }
  
  console.log(`\n  📊 Total predefined relationships: ${totalRelationships.toLocaleString()}`);
}

function calculateRelationshipStrength(word1, word2, relType) {
  // Simple strength calculation based on relationship type and word similarity
  let baseStrength = 1.0;
  
  switch (relType) {
    case 'synonym':
      baseStrength = 0.9;
      break;
    case 'antonym':
      baseStrength = 0.8;
      break;
    case 'collocation':
      baseStrength = 0.7;
      break;
    case 'word_family':
      baseStrength = 0.85;
      break;
    default:
      baseStrength = 0.5;
  }
  
  // Adjust for word length similarity (longer words = more specific = higher strength)
  const lengthSimilarity = 1 - Math.abs(word1.length - word2.length) / Math.max(word1.length, word2.length);
  
  return Math.round((baseStrength * (0.7 + 0.3 * lengthSimilarity)) * 100) / 100;
}

async function generateAutomaticRelationships(client) {
  console.log('\n🤖 Generating automatic relationships based on patterns...');
  
  // Generate word family relationships based on common suffixes
  await generateWordFamilies(client);
  
  // Generate semantic clusters based on categories
  await generateSemanticClusters(client);
  
  // Generate frequency-based relationships
  await generateFrequencyBasedRelationships(client);
}

async function generateWordFamilies(client) {
  console.log('\n  🌳 Generating word family relationships...');
  
  // Common English suffixes and their base forms
  const suffixPatterns = [
    { suffix: 'ly', base_suffix: '', type: 'adverb_from_adjective' },
    { suffix: 'ness', base_suffix: '', type: 'noun_from_adjective' },
    { suffix: 'tion', base_suffix: '', type: 'noun_from_verb' },
    { suffix: 'ing', base_suffix: '', type: 'gerund_from_verb' },
    { suffix: 'ed', base_suffix: '', type: 'past_from_verb' },
    { suffix: 'er', base_suffix: '', type: 'agent_noun' },
    { suffix: 'est', base_suffix: '', type: 'superlative' }
  ];
  
  let familiesCreated = 0;
  
  for (const pattern of suffixPatterns) {
    const familyResult = await client.query(`
      SELECT 
        w1.id as derived_id,
        w2.id as base_id,
        w1.word as derived_word,
        w2.word as base_word,
        w1.target_lang
      FROM words w1
      JOIN words w2 ON (
        w1.word = w2.word || $1
        AND w1.source_lang = w2.source_lang
        AND w1.target_lang = w2.target_lang
        AND w1.id != w2.id
      )
      WHERE w1.word LIKE '%' || $1
      AND w1.source_lang = 'en'
      LIMIT 1000
    `, [pattern.suffix]);
    
    for (const family of familyResult.rows) {
      const strength = 0.85; // High strength for morphological relationships
      
      await client.query(`
        INSERT INTO word_relationships (word_id, related_word_id, relationship_type, strength, language_code)
        VALUES ($1, $2, 'word_family', $3, $4)
        ON CONFLICT (word_id, related_word_id, relationship_type) DO NOTHING
      `, [family.derived_id, family.base_id, strength, family.target_lang]);
      
      familiesCreated++;
    }
  }
  
  console.log(`    ✅ Created ${familiesCreated} word family relationships`);
}

async function generateSemanticClusters(client) {
  console.log('\n  🎯 Generating semantic clusters by category...');
  
  // Get words grouped by category for cluster creation
  const categoriesResult = await client.query(`
    SELECT 
      category,
      target_lang,
      array_agg(id) as word_ids,
      array_agg(word) as words,
      COUNT(*) as word_count
    FROM words 
    WHERE category NOT IN ('general', 'dictionary_mined')
    AND source_lang = 'en'
    GROUP BY category, target_lang
    HAVING COUNT(*) >= 5
    ORDER BY word_count DESC
  `);
  
  let clustersCreated = 0;
  
  for (const category of categoriesResult.rows) {
    // Create semantic cluster
    const clusterResult = await client.query(`
      INSERT INTO semantic_clusters (cluster_name, theme, word_ids, cluster_strength)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      `${category.category}_${category.target_lang}`,
      category.category,
      category.word_ids,
      Math.min(1.0, category.word_count / 100) // Strength based on cluster size
    ]);
    
    const clusterId = clusterResult.rows[0].id;
    
    // Create relationships between words in the same cluster
    const wordIds = category.word_ids;
    for (let i = 0; i < wordIds.length; i++) {
      for (let j = i + 1; j < wordIds.length && j < i + 10; j++) { // Limit to avoid explosion
        await client.query(`
          INSERT INTO word_relationships (word_id, related_word_id, relationship_type, strength, language_code)
          VALUES ($1, $2, 'semantic_cluster', $3, $4)
          ON CONFLICT (word_id, related_word_id, relationship_type) DO NOTHING
        `, [wordIds[i], wordIds[j], 0.6, category.target_lang]);
      }
    }
    
    clustersCreated++;
  }
  
  console.log(`    ✅ Created ${clustersCreated} semantic clusters`);
}

async function generateFrequencyBasedRelationships(client) {
  console.log('\n  📊 Generating frequency-based learning relationships...');
  
  // Create relationships between words of similar frequency (learning progression)
  const progressionResult = await client.query(`
    INSERT INTO word_relationships (word_id, related_word_id, relationship_type, strength, language_code)
    SELECT DISTINCT
      w1.id,
      w2.id,
      'learning_progression',
      0.4,
      w1.target_lang
    FROM words w1
    JOIN words w2 ON (
      w1.target_lang = w2.target_lang
      AND w1.source_lang = w2.source_lang
      AND w1.cefr_level = w2.cefr_level
      AND ABS(COALESCE(w1.frequency_rank, 9999) - COALESCE(w2.frequency_rank, 9999)) < 100
      AND w1.id != w2.id
    )
    WHERE w1.frequency_rank IS NOT NULL
    AND w2.frequency_rank IS NOT NULL
    AND w1.source_lang = 'en'
    AND RANDOM() < 0.1 -- Sample to avoid too many relationships
    ON CONFLICT (word_id, related_word_id, relationship_type) DO NOTHING
  `);
  
  console.log(`    ✅ Created ${progressionResult.rowCount} frequency-based relationships`);
}

async function calculateSemanticMetrics(client) {
  console.log('\n📊 Calculating semantic network metrics...');
  
  // Update relationship count for each word
  await client.query(`
    UPDATE words 
    SET relationship_count = (
      SELECT COUNT(*) 
      FROM word_relationships 
      WHERE word_id = words.id
    )
  `);
  
  // Mark words with rich semantic connections as learning priorities
  await client.query(`
    UPDATE words 
    SET category = category || '_semantic_rich'
    WHERE relationship_count >= 5
    AND cefr_level IN ('A1', 'A2', 'B1')
    AND category NOT LIKE '%semantic_rich%'
  `);
  
  console.log('  ✅ Semantic metrics calculated');
}

async function generateRelationshipsSummary(client) {
  console.log('\n📊 Generating word relationships summary...');
  
  // Overall statistics
  const statsResult = await client.query(`
    SELECT 
      COUNT(*) as total_relationships,
      COUNT(DISTINCT word_id) as words_with_relationships,
      COUNT(DISTINCT relationship_type) as relationship_types,
      AVG(strength) as avg_strength
    FROM word_relationships
  `);
  
  const stats = statsResult.rows[0];
  
  // Breakdown by relationship type
  const typeResult = await client.query(`
    SELECT 
      relationship_type,
      COUNT(*) as count,
      AVG(strength) as avg_strength,
      COUNT(DISTINCT language_code) as languages
    FROM word_relationships
    GROUP BY relationship_type
    ORDER BY count DESC
  `);
  
  console.log('\nWORD RELATIONSHIPS SUMMARY:');
  console.log('-'.repeat(50));
  console.log(`📊 Total relationships: ${parseInt(stats.total_relationships).toLocaleString()}`);
  console.log(`🔗 Words with relationships: ${parseInt(stats.words_with_relationships).toLocaleString()}`);
  console.log(`🏷️  Relationship types: ${stats.relationship_types}`);
  console.log(`💪 Average strength: ${parseFloat(stats.avg_strength).toFixed(2)}`);
  
  console.log('\nBreakdown by relationship type:');
  typeResult.rows.forEach(type => {
    console.log(`  ${type.relationship_type}: ${parseInt(type.count).toLocaleString()} (strength: ${parseFloat(type.avg_strength).toFixed(2)}, languages: ${type.languages})`);
  });
  
  // Top connected words
  const topWordsResult = await client.query(`
    SELECT 
      w.word,
      w.target_lang,
      w.relationship_count
    FROM words w
    WHERE w.relationship_count > 0
    ORDER BY w.relationship_count DESC
    LIMIT 10
  `);
  
  console.log('\nMost connected words:');
  topWordsResult.rows.forEach((word, i) => {
    console.log(`  ${i+1}. "${word.word}" (${word.target_lang}): ${word.relationship_count} relationships`);
  });
  
  console.log('\n🎉 WORD RELATIONSHIPS INTEGRATION COMPLETE!');
  console.log('Users can now discover related vocabulary for enhanced learning!');
}

if (require.main === module) {
  addWordRelationships().catch(console.error);
}

module.exports = { 
  addWordRelationships, 
  calculateRelationshipStrength,
  WORD_RELATIONSHIPS 
};