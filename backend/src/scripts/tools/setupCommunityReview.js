/**
 * Setup community-driven quality review system
 * 
 * This script creates:
 * 1. User feedback and reporting system for vocabulary quality
 * 2. Native speaker validation workflow
 * 3. Community ratings and improvement suggestions
 * 4. Automated quality scoring and flagging
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function setupCommunityReview() {
  console.log('👥 SETTING UP COMMUNITY QUALITY REVIEW SYSTEM');
  console.log('=' .repeat(60));
  
  const client = await pool.connect();
  
  try {
    // Step 1: Create community review schema
    await setupCommunityReviewSchema(client);
    
    // Step 2: Setup quality scoring system
    await setupQualityScoring(client);
    
    // Step 3: Create native speaker validation workflow
    await setupNativeSpeakerValidation(client);
    
    // Step 4: Setup automated quality detection
    await setupAutomatedQualityDetection(client);
    
    // Step 5: Initialize community features
    await initializeCommunityFeatures(client);
    
  } finally {
    client.release();
    await pool.end();
  }
}

async function setupCommunityReviewSchema(client) {
  console.log('\n📋 Setting up community review database schema...');
  
  const schemaQueries = [
    // User feedback and reports table
    `CREATE TABLE IF NOT EXISTS word_feedback (
      id SERIAL PRIMARY KEY,
      word_id VARCHAR(100) REFERENCES words(id),
      user_id INTEGER,
      feedback_type VARCHAR(50), -- 'incorrect_translation', 'inappropriate_content', 'pronunciation_error', 'suggestion'
      description TEXT,
      suggested_improvement TEXT,
      severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
      status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'rejected'
      reviewer_id INTEGER,
      reviewer_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      resolved_at TIMESTAMP
    )`,
    
    // Community ratings table
    `CREATE TABLE IF NOT EXISTS word_ratings (
      id SERIAL PRIMARY KEY,
      word_id VARCHAR(100) REFERENCES words(id),
      user_id INTEGER,
      translation_quality INTEGER CHECK (translation_quality BETWEEN 1 AND 5),
      pronunciation_quality INTEGER CHECK (pronunciation_quality BETWEEN 1 AND 5),
      example_quality INTEGER CHECK (example_quality BETWEEN 1 AND 5),
      overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
      difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5), -- User's perception vs CEFR
      usefulness_rating INTEGER CHECK (usefulness_rating BETWEEN 1 AND 5),
      comments TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(word_id, user_id)
    )`,
    
    // Native speaker validation table
    `CREATE TABLE IF NOT EXISTS native_speaker_validations (
      id SERIAL PRIMARY KEY,
      word_id VARCHAR(100) REFERENCES words(id),
      validator_id INTEGER,
      validator_language VARCHAR(10),
      validator_qualification VARCHAR(100), -- 'native_speaker', 'language_teacher', 'linguist'
      validation_score INTEGER CHECK (validation_score BETWEEN 1 AND 5),
      translation_accuracy INTEGER CHECK (translation_accuracy BETWEEN 1 AND 5),
      cultural_appropriateness INTEGER CHECK (cultural_appropriateness BETWEEN 1 AND 5),
      natural_usage INTEGER CHECK (natural_usage BETWEEN 1 AND 5),
      pronunciation_accuracy INTEGER CHECK (pronunciation_accuracy BETWEEN 1 AND 5),
      suggested_corrections TEXT,
      validation_notes TEXT,
      confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Quality scores aggregation table
    `CREATE TABLE IF NOT EXISTS word_quality_scores (
      word_id VARCHAR(100) PRIMARY KEY REFERENCES words(id),
      community_rating_avg FLOAT DEFAULT 0,
      community_rating_count INTEGER DEFAULT 0,
      native_speaker_score FLOAT DEFAULT 0,
      native_speaker_count INTEGER DEFAULT 0,
      feedback_positive_ratio FLOAT DEFAULT 0,
      feedback_total_count INTEGER DEFAULT 0,
      automated_quality_score FLOAT DEFAULT 0,
      overall_quality_score FLOAT DEFAULT 0,
      quality_confidence FLOAT DEFAULT 0,
      needs_review BOOLEAN DEFAULT FALSE,
      last_updated TIMESTAMP DEFAULT NOW()
    )`,
    
    // Quality improvement suggestions table
    `CREATE TABLE IF NOT EXISTS improvement_suggestions (
      id SERIAL PRIMARY KEY,
      word_id VARCHAR(100) REFERENCES words(id),
      suggestion_type VARCHAR(50), -- 'better_translation', 'add_context', 'fix_pronunciation'
      original_value TEXT,
      suggested_value TEXT,
      justification TEXT,
      suggested_by INTEGER,
      votes_for INTEGER DEFAULT 0,
      votes_against INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      implemented_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // User contribution tracking
    `CREATE TABLE IF NOT EXISTS user_contributions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      contribution_type VARCHAR(50),
      contribution_count INTEGER DEFAULT 1,
      quality_score FLOAT DEFAULT 0,
      reputation_points INTEGER DEFAULT 0,
      last_contribution TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, contribution_type)
    )`,
    
    // Performance indexes
    `CREATE INDEX IF NOT EXISTS idx_word_feedback_word ON word_feedback(word_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_word_ratings_word ON word_ratings(word_id)`,
    `CREATE INDEX IF NOT EXISTS idx_native_validations_word ON native_speaker_validations(word_id)`,
    `CREATE INDEX IF NOT EXISTS idx_quality_scores_needs_review ON word_quality_scores(needs_review) WHERE needs_review = TRUE`,
    `CREATE INDEX IF NOT EXISTS idx_quality_scores_overall ON word_quality_scores(overall_quality_score DESC)`
  ];
  
  for (const query of schemaQueries) {
    await client.query(query);
  }
  
  // Add quality score column to main words table
  await client.query(`
    ALTER TABLE words ADD COLUMN IF NOT EXISTS community_quality_score FLOAT DEFAULT 0
  `);
  
  console.log('  ✅ Community review schema setup complete');
}

async function setupQualityScoring(client) {
  console.log('\n📊 Setting up quality scoring system...');
  
  // Create quality scoring functions
  const scoringQueries = [
    // Function to calculate overall quality score
    `CREATE OR REPLACE FUNCTION calculate_quality_score(word_id_param VARCHAR(100))
    RETURNS FLOAT AS $$
    DECLARE
      community_score FLOAT := 0;
      native_score FLOAT := 0;
      feedback_score FLOAT := 0;
      automated_score FLOAT := 0;
      overall_score FLOAT := 0;
      confidence FLOAT := 0;
    BEGIN
      -- Get community rating average
      SELECT COALESCE(AVG(overall_rating), 0) INTO community_score
      FROM word_ratings WHERE word_id = word_id_param;
      
      -- Get native speaker validation average
      SELECT COALESCE(AVG(validation_score), 0) INTO native_score
      FROM native_speaker_validations WHERE word_id = word_id_param;
      
      -- Calculate feedback score (positive ratio)
      SELECT COALESCE(
        SUM(CASE WHEN feedback_type IN ('suggestion', 'compliment') THEN 1 ELSE 0 END)::FLOAT /
        NULLIF(COUNT(*), 0), 0
      ) INTO feedback_score
      FROM word_feedback WHERE word_id = word_id_param;
      
      -- Get automated quality score
      SELECT COALESCE(automated_quality_score, 0) INTO automated_score
      FROM word_quality_scores WHERE word_id = word_id_param;
      
      -- Calculate weighted overall score
      overall_score := (
        community_score * 0.3 +
        native_score * 0.4 +
        feedback_score * 0.2 +
        automated_score * 0.1
      );
      
      -- Calculate confidence based on data availability
      confidence := LEAST(1.0, (
        CASE WHEN community_score > 0 THEN 0.25 ELSE 0 END +
        CASE WHEN native_score > 0 THEN 0.4 ELSE 0 END +
        CASE WHEN feedback_score > 0 THEN 0.2 ELSE 0 END +
        CASE WHEN automated_score > 0 THEN 0.15 ELSE 0 END
      ));
      
      -- Update quality scores table
      INSERT INTO word_quality_scores (
        word_id, overall_quality_score, quality_confidence,
        community_rating_avg, native_speaker_score,
        feedback_positive_ratio, automated_quality_score
      ) VALUES (
        word_id_param, overall_score, confidence,
        community_score, native_score, feedback_score, automated_score
      )
      ON CONFLICT (word_id) DO UPDATE SET
        overall_quality_score = overall_score,
        quality_confidence = confidence,
        community_rating_avg = community_score,
        native_speaker_score = native_score,
        feedback_positive_ratio = feedback_score,
        last_updated = NOW();
      
      -- Update main words table
      UPDATE words SET community_quality_score = overall_score
      WHERE id = word_id_param;
      
      RETURN overall_score;
    END;
    $$ LANGUAGE plpgsql;`,
    
    // Function to flag words needing review
    `CREATE OR REPLACE FUNCTION flag_words_for_review()
    RETURNS INTEGER AS $$
    DECLARE
      flagged_count INTEGER := 0;
    BEGIN
      -- Flag words with low quality scores
      UPDATE word_quality_scores 
      SET needs_review = TRUE
      WHERE overall_quality_score < 2.5 
      AND quality_confidence > 0.3
      AND NOT needs_review;
      
      GET DIAGNOSTICS flagged_count = ROW_COUNT;
      
      -- Flag words with multiple negative feedback
      UPDATE word_quality_scores 
      SET needs_review = TRUE
      WHERE word_id IN (
        SELECT word_id FROM word_feedback 
        WHERE feedback_type IN ('incorrect_translation', 'inappropriate_content')
        AND status = 'pending'
        GROUP BY word_id 
        HAVING COUNT(*) >= 3
      );
      
      RETURN flagged_count;
    END;
    $$ LANGUAGE plpgsql;`,
    
    // Function to update user reputation
    `CREATE OR REPLACE FUNCTION update_user_reputation(
      user_id_param INTEGER,
      contribution_type_param VARCHAR(50),
      points INTEGER DEFAULT 1
    ) RETURNS VOID AS $$
    BEGIN
      INSERT INTO user_contributions (
        user_id, contribution_type, contribution_count, reputation_points
      ) VALUES (
        user_id_param, contribution_type_param, 1, points
      )
      ON CONFLICT (user_id, contribution_type) DO UPDATE SET
        contribution_count = user_contributions.contribution_count + 1,
        reputation_points = user_contributions.reputation_points + points,
        last_contribution = NOW();
    END;
    $$ LANGUAGE plpgsql;`
  ];
  
  for (const query of scoringQueries) {
    await client.query(query);
  }
  
  console.log('  ✅ Quality scoring system setup complete');
}

async function setupNativeSpeakerValidation(client) {
  console.log('\n🗣️ Setting up native speaker validation workflow...');
  
  // Create validation workflow functions
  const validationQueries = [
    // Function to get words needing native speaker validation
    `CREATE OR REPLACE FUNCTION get_words_for_validation(
      language_code VARCHAR(10),
      limit_count INTEGER DEFAULT 50
    ) RETURNS TABLE (
      word_id VARCHAR(100),
      word TEXT,
      translation TEXT,
      current_quality FLOAT,
      priority_score FLOAT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        w.id,
        w.word,
        w.translation,
        COALESCE(wqs.overall_quality_score, 0) as current_quality,
        (
          CASE WHEN w.frequency_rank IS NOT NULL THEN (20000 - w.frequency_rank)::FLOAT / 20000 ELSE 0 END +
          CASE WHEN w.cefr_level IN ('A1', 'A2') THEN 1.0 ELSE 0.5 END +
          CASE WHEN COALESCE(wqs.native_speaker_count, 0) = 0 THEN 2.0 ELSE 0 END
        ) as priority_score
      FROM words w
      LEFT JOIN word_quality_scores wqs ON w.id = wqs.word_id
      WHERE w.target_lang = language_code
      AND (wqs.native_speaker_count IS NULL OR wqs.native_speaker_count < 3)
      ORDER BY priority_score DESC
      LIMIT limit_count;
    END;
    $$ LANGUAGE plpgsql;`,
    
    // Function to submit native speaker validation
    `CREATE OR REPLACE FUNCTION submit_validation(
      word_id_param VARCHAR(100),
      validator_id_param INTEGER,
      language_param VARCHAR(10),
      qualification_param VARCHAR(100),
      validation_data JSONB
    ) RETURNS BOOLEAN AS $$
    DECLARE
      validation_score INTEGER;
      translation_score INTEGER;
      cultural_score INTEGER;
      natural_score INTEGER;
      pronunciation_score INTEGER;
    BEGIN
      -- Extract scores from JSON
      validation_score := (validation_data->>'overall_score')::INTEGER;
      translation_score := (validation_data->>'translation_accuracy')::INTEGER;
      cultural_score := (validation_data->>'cultural_appropriateness')::INTEGER;
      natural_score := (validation_data->>'natural_usage')::INTEGER;
      pronunciation_score := (validation_data->>'pronunciation_accuracy')::INTEGER;
      
      -- Insert validation
      INSERT INTO native_speaker_validations (
        word_id, validator_id, validator_language, validator_qualification,
        validation_score, translation_accuracy, cultural_appropriateness,
        natural_usage, pronunciation_accuracy,
        suggested_corrections, validation_notes, confidence_level
      ) VALUES (
        word_id_param, validator_id_param, language_param, qualification_param,
        validation_score, translation_score, cultural_score,
        natural_score, pronunciation_score,
        validation_data->>'suggested_corrections',
        validation_data->>'notes',
        (validation_data->>'confidence')::INTEGER
      );
      
      -- Update user reputation
      PERFORM update_user_reputation(validator_id_param, 'native_validation', 5);
      
      -- Recalculate quality score
      PERFORM calculate_quality_score(word_id_param);
      
      RETURN TRUE;
    END;
    $$ LANGUAGE plpgsql;`
  ];
  
  for (const query of validationQueries) {
    await client.query(query);
  }
  
  console.log('  ✅ Native speaker validation workflow setup complete');
}

async function setupAutomatedQualityDetection(client) {
  console.log('\n🤖 Setting up automated quality detection...');
  
  // Create automated quality detection functions
  const qualityDetectionQueries = [
    // Function to detect potential quality issues
    `CREATE OR REPLACE FUNCTION detect_quality_issues()
    RETURNS TABLE (
      word_id VARCHAR(100),
      issue_type VARCHAR(50),
      severity VARCHAR(20),
      description TEXT
    ) AS $$
    BEGIN
      -- Check for suspiciously long translations
      RETURN QUERY
      SELECT 
        w.id,
        'long_translation' as issue_type,
        'medium' as severity,
        'Translation is unusually long (' || LENGTH(w.translation) || ' characters)' as description
      FROM words w
      WHERE LENGTH(w.translation) > 50
      AND w.category = 'dictionary_mined';
      
      -- Check for identical word and translation
      RETURN QUERY
      SELECT 
        w.id,
        'identical_word_translation' as issue_type,
        'high' as severity,
        'Word and translation are identical' as description
      FROM words w
      WHERE LOWER(w.word) = LOWER(w.translation)
      AND w.source_lang != w.target_lang;
      
      -- Check for words with numbers or symbols
      RETURN QUERY
      SELECT 
        w.id,
        'contains_numbers_symbols' as issue_type,
        'low' as severity,
        'Contains numbers or unusual symbols' as description
      FROM words w
      WHERE w.word ~ '[0-9@#$%^&*()_+={}|<>?]'
      OR w.translation ~ '[0-9@#$%^&*()_+={}|<>?]';
      
      -- Check for extremely high frequency words with low CEFR levels
      RETURN QUERY
      SELECT 
        w.id,
        'cefr_frequency_mismatch' as issue_type,
        'medium' as severity,
        'High frequency word (' || w.frequency_rank || ') assigned to advanced level' as description
      FROM words w
      WHERE w.frequency_rank <= 1000
      AND w.cefr_level IN ('C1', 'C2');
      
    END;
    $$ LANGUAGE plpgsql;`,
    
    // Function to run automated quality assessment
    `CREATE OR REPLACE FUNCTION run_automated_quality_assessment()
    RETURNS INTEGER AS $$
    DECLARE
      words_assessed INTEGER := 0;
      quality_score FLOAT;
    BEGIN
      -- Update automated quality scores for all words
      FOR word_id IN 
        SELECT id FROM words 
        WHERE community_quality_score IS NULL 
        OR community_quality_score = 0
        LIMIT 10000
      LOOP
        -- Calculate automated quality score based on multiple factors
        quality_score := (
          CASE WHEN LENGTH(word) BETWEEN 2 AND 20 THEN 1.0 ELSE 0.5 END +
          CASE WHEN LENGTH(translation) BETWEEN 2 AND 30 THEN 1.0 ELSE 0.5 END +
          CASE WHEN frequency_rank IS NOT NULL THEN 1.0 ELSE 0.7 END +
          CASE WHEN category != 'dictionary_mined' THEN 1.0 ELSE 0.8 END +
          CASE WHEN cefr_level IS NOT NULL THEN 0.5 ELSE 0.2 END
        );
        
        -- Normalize to 1-5 scale
        quality_score := LEAST(5.0, quality_score);
        
        -- Update quality scores
        INSERT INTO word_quality_scores (word_id, automated_quality_score)
        VALUES (word_id, quality_score)
        ON CONFLICT (word_id) DO UPDATE SET
          automated_quality_score = quality_score,
          last_updated = NOW();
        
        words_assessed := words_assessed + 1;
      END LOOP;
      
      RETURN words_assessed;
    END;
    $$ LANGUAGE plpgsql;`
  ];
  
  for (const query of qualityDetectionQueries) {
    await client.query(query);
  }
  
  console.log('  ✅ Automated quality detection setup complete');
}

async function initializeCommunityFeatures(client) {
  console.log('\n🎯 Initializing community features with sample data...');
  
  // Run initial quality assessment
  const assessmentResult = await client.query(`SELECT run_automated_quality_assessment()`);
  console.log(`  📊 Assessed ${assessmentResult.rows[0].run_automated_quality_assessment} words automatically`);
  
  // Detect quality issues
  const issuesResult = await client.query(`SELECT * FROM detect_quality_issues() LIMIT 10`);
  console.log(`  🔍 Detected ${issuesResult.rows.length} potential quality issues`);
  
  // Insert sample community ratings
  const sampleWords = await client.query(`
    SELECT id FROM words 
    WHERE frequency_rank IS NOT NULL 
    AND frequency_rank <= 100 
    LIMIT 5
  `);
  
  if (sampleWords.rows.length > 0) {
    for (const word of sampleWords.rows) {
      // Insert sample ratings
      const sampleRatings = [
        { userId: 2001, overall: 4, translation: 4, usefulness: 5 },
        { userId: 2002, overall: 5, translation: 5, usefulness: 4 },
        { userId: 2003, overall: 3, translation: 4, usefulness: 3 }
      ];
      
      for (const rating of sampleRatings) {
        await client.query(`
          INSERT INTO word_ratings (
            word_id, user_id, overall_rating, translation_quality, usefulness_rating
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (word_id, user_id) DO NOTHING
        `, [word.id, rating.userId, rating.overall, rating.translation, rating.usefulness]);
      }
      
      // Recalculate quality score
      await client.query(`SELECT calculate_quality_score($1)`, [word.id]);
    }
  }
  
  // Flag words for review
  const flaggedResult = await client.query(`SELECT flag_words_for_review()`);
  console.log(`  🚩 Flagged ${flaggedResult.rows[0].flag_words_for_review} words for review`);
  
  // Generate summary statistics
  await generateCommunityReviewSummary(client);
  
  console.log('  ✅ Community features initialized');
}

async function generateCommunityReviewSummary(client) {
  console.log('\n📊 Generating community review system summary...');
  
  // Overall quality statistics
  const qualityStats = await client.query(`
    SELECT 
      COUNT(*) as total_words,
      COUNT(CASE WHEN community_quality_score > 0 THEN 1 END) as words_with_scores,
      AVG(community_quality_score) as avg_quality_score,
      COUNT(CASE WHEN needs_review = TRUE THEN 1 END) as words_needing_review,
      COUNT(CASE WHEN overall_quality_score >= 4.0 THEN 1 END) as high_quality_words
    FROM word_quality_scores wqs
    RIGHT JOIN words w ON wqs.word_id = w.id
  `);
  
  const stats = qualityStats.rows[0];
  
  // Community engagement statistics
  const engagementStats = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM word_ratings) as total_ratings,
      (SELECT COUNT(*) FROM word_feedback) as total_feedback,
      (SELECT COUNT(*) FROM native_speaker_validations) as total_validations,
      (SELECT COUNT(*) FROM improvement_suggestions) as total_suggestions,
      (SELECT COUNT(DISTINCT user_id) FROM user_contributions) as active_contributors
  `);
  
  const engagement = engagementStats.rows[0];
  
  // Quality distribution
  const qualityDist = await client.query(`
    SELECT 
      CASE 
        WHEN overall_quality_score >= 4.5 THEN 'Excellent (4.5+)'
        WHEN overall_quality_score >= 3.5 THEN 'Good (3.5-4.4)'
        WHEN overall_quality_score >= 2.5 THEN 'Fair (2.5-3.4)'
        WHEN overall_quality_score >= 1.5 THEN 'Poor (1.5-2.4)'
        ELSE 'Very Poor (<1.5)'
      END as quality_range,
      COUNT(*) as word_count
    FROM word_quality_scores
    GROUP BY 
      CASE 
        WHEN overall_quality_score >= 4.5 THEN 'Excellent (4.5+)'
        WHEN overall_quality_score >= 3.5 THEN 'Good (3.5-4.4)'
        WHEN overall_quality_score >= 2.5 THEN 'Fair (2.5-3.4)'
        WHEN overall_quality_score >= 1.5 THEN 'Poor (1.5-2.4)'
        ELSE 'Very Poor (<1.5)'
      END
    ORDER BY MIN(overall_quality_score) DESC
  `);
  
  console.log('\nCOMMUNITY QUALITY REVIEW SYSTEM SUMMARY:');
  console.log('-'.repeat(60));
  console.log(`📊 Total vocabulary: ${parseInt(stats.total_words).toLocaleString()}`);
  console.log(`⭐ Words with quality scores: ${parseInt(stats.words_with_scores).toLocaleString()} (${((stats.words_with_scores/stats.total_words)*100).toFixed(1)}%)`);
  console.log(`📈 Average quality score: ${parseFloat(stats.avg_quality_score).toFixed(2)}/5.0`);
  console.log(`🚩 Words needing review: ${parseInt(stats.words_needing_review).toLocaleString()}`);
  console.log(`✨ High-quality words (4.0+): ${parseInt(stats.high_quality_words).toLocaleString()}`);
  
  console.log('\nCommunity Engagement:');
  console.log(`👥 Active contributors: ${parseInt(engagement.active_contributors).toLocaleString()}`);
  console.log(`⭐ Community ratings: ${parseInt(engagement.total_ratings).toLocaleString()}`);
  console.log(`📝 Feedback reports: ${parseInt(engagement.total_feedback).toLocaleString()}`);
  console.log(`🗣️ Native validations: ${parseInt(engagement.total_validations).toLocaleString()}`);
  console.log(`💡 Improvement suggestions: ${parseInt(engagement.total_suggestions).toLocaleString()}`);
  
  console.log('\nQuality Distribution:');
  for (const dist of qualityDist.rows) {
    console.log(`  ${dist.quality_range}: ${parseInt(dist.word_count).toLocaleString()} words`);
  }
  
  console.log('\n🎉 COMMUNITY QUALITY REVIEW SYSTEM SETUP COMPLETE!');
  console.log('Ready for crowdsourced vocabulary quality improvement!');
}

if (require.main === module) {
  setupCommunityReview().catch(console.error);
}

module.exports = { 
  setupCommunityReview, 
  setupCommunityReviewSchema,
  setupQualityScoring 
};