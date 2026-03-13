/**
 * Setup A/B testing framework for vocabulary enhancement effectiveness
 * 
 * This script creates:
 * 1. A/B testing infrastructure for comparing vocabulary sets
 * 2. Analytics tracking for learning effectiveness metrics
 * 3. User cohort management for testing
 * 4. Statistical analysis tools for results
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function setupABTesting() {
  console.log('🧪 SETTING UP A/B TESTING FRAMEWORK');
  console.log('=' .repeat(60));
  
  const client = await pool.connect();
  
  try {
    // Step 1: Create A/B testing schema
    await setupABTestingSchema(client);
    
    // Step 2: Create vocabulary cohorts
    await createVocabularyCohorts(client);
    
    // Step 3: Setup learning analytics tracking
    await setupLearningAnalytics(client);
    
    // Step 4: Create statistical analysis functions
    await setupStatisticalAnalysis(client);
    
    // Step 5: Initialize test cohorts
    await initializeTestCohorts(client);
    
  } finally {
    client.release();
    await pool.end();
  }
}

async function setupABTestingSchema(client) {
  console.log('\n📋 Setting up A/B testing database schema...');
  
  const schemaQueries = [
    // A/B Tests table
    `CREATE TABLE IF NOT EXISTS ab_tests (
      id SERIAL PRIMARY KEY,
      test_name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      hypothesis TEXT,
      start_date DATE DEFAULT CURRENT_DATE,
      end_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      control_group_name VARCHAR(50),
      treatment_group_name VARCHAR(50),
      sample_size_target INTEGER,
      confidence_level FLOAT DEFAULT 0.95,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // User cohorts table
    `CREATE TABLE IF NOT EXISTS user_cohorts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      test_id INTEGER REFERENCES ab_tests(id),
      cohort_group VARCHAR(20), -- 'control' or 'treatment'
      assigned_at TIMESTAMP DEFAULT NOW(),
      vocabulary_variant VARCHAR(50),
      feature_flags JSONB DEFAULT '{}',
      UNIQUE(user_id, test_id)
    )`,
    
    // Learning events tracking
    `CREATE TABLE IF NOT EXISTS learning_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      test_id INTEGER REFERENCES ab_tests(id),
      cohort_group VARCHAR(20),
      event_type VARCHAR(50), -- 'word_learned', 'session_completed', 'level_advanced'
      event_data JSONB,
      word_id VARCHAR(100),
      session_id VARCHAR(100),
      timestamp TIMESTAMP DEFAULT NOW(),
      learning_duration_seconds INTEGER,
      success_rate FLOAT,
      retention_score FLOAT
    )`,
    
    // Test results aggregation
    `CREATE TABLE IF NOT EXISTS ab_test_results (
      id SERIAL PRIMARY KEY,
      test_id INTEGER REFERENCES ab_tests(id),
      metric_name VARCHAR(100),
      control_value FLOAT,
      treatment_value FLOAT,
      confidence_interval_lower FLOAT,
      confidence_interval_upper FLOAT,
      p_value FLOAT,
      statistical_significance BOOLEAN,
      effect_size FLOAT,
      sample_size_control INTEGER,
      sample_size_treatment INTEGER,
      calculated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Performance indexes
    `CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_learning_events_test ON learning_events(test_id, cohort_group)`,
    `CREATE INDEX IF NOT EXISTS idx_user_cohorts_test ON user_cohorts(test_id, cohort_group)`,
    `CREATE INDEX IF NOT EXISTS idx_learning_events_word ON learning_events(word_id)`
  ];
  
  for (const query of schemaQueries) {
    await client.query(query);
  }
  
  console.log('  ✅ A/B testing schema setup complete');
}

async function createVocabularyCohorts(client) {
  console.log('\n👥 Creating vocabulary testing cohorts...');
  
  // Create main vocabulary enhancement test
  const testResult = await client.query(`
    INSERT INTO ab_tests (
      test_name,
      description,
      hypothesis,
      control_group_name,
      treatment_group_name,
      sample_size_target,
      status
    ) VALUES (
      'vocabulary_enhancement_2024',
      'Testing effectiveness of enhanced vocabulary (856k words) vs original vocabulary (125k words)',
      'Enhanced vocabulary with CEFR levels, examples, and relationships improves learning outcomes',
      'original_vocabulary',
      'enhanced_vocabulary',
      10000,
      'active'
    )
    ON CONFLICT (test_name) DO UPDATE SET
      description = EXCLUDED.description,
      hypothesis = EXCLUDED.hypothesis
    RETURNING id
  `);
  
  const testId = testResult.rows[0].id;
  
  // Create pronunciation test
  await client.query(`
    INSERT INTO ab_tests (
      test_name,
      description,
      hypothesis,
      control_group_name,
      treatment_group_name,
      sample_size_target,
      status
    ) VALUES (
      'pronunciation_impact_2024',
      'Testing impact of pronunciation data (IPA + audio) on vocabulary retention',
      'Words with pronunciation data show higher retention rates',
      'no_pronunciation',
      'with_pronunciation',
      5000,
      'active'
    )
    ON CONFLICT (test_name) DO NOTHING
  `);
  
  // Create example sentences test
  await client.query(`
    INSERT INTO ab_tests (
      test_name,
      description,
      hypothesis,
      control_group_name,
      treatment_group_name,
      sample_size_target,
      status
    ) VALUES (
      'example_sentences_2024',
      'Testing effectiveness of contextual example sentences on comprehension',
      'Words with example sentences improve comprehension and usage accuracy',
      'words_only',
      'words_with_examples',
      7500,
      'active'
    )
    ON CONFLICT (test_name) DO NOTHING
  `);
  
  console.log(`  ✅ Created vocabulary testing cohorts (Test ID: ${testId})`);
}

async function setupLearningAnalytics(client) {
  console.log('\n📊 Setting up learning analytics tracking...');
  
  // Create analytics functions for common metrics
  const analyticsQueries = [
    // Function to track learning events
    `CREATE OR REPLACE FUNCTION track_learning_event(
      p_user_id INTEGER,
      p_event_type VARCHAR(50),
      p_event_data JSONB DEFAULT '{}',
      p_word_id VARCHAR(100) DEFAULT NULL,
      p_session_id VARCHAR(100) DEFAULT NULL,
      p_duration INTEGER DEFAULT NULL,
      p_success_rate FLOAT DEFAULT NULL
    ) RETURNS VOID AS $$
    DECLARE
      v_test_id INTEGER;
      v_cohort_group VARCHAR(20);
    BEGIN
      -- Get user's test assignment
      SELECT test_id, cohort_group INTO v_test_id, v_cohort_group
      FROM user_cohorts 
      WHERE user_id = p_user_id 
      AND test_id = (SELECT id FROM ab_tests WHERE status = 'active' LIMIT 1);
      
      -- Insert learning event
      INSERT INTO learning_events (
        user_id, test_id, cohort_group, event_type, event_data,
        word_id, session_id, learning_duration_seconds, success_rate
      ) VALUES (
        p_user_id, v_test_id, v_cohort_group, p_event_type, p_event_data,
        p_word_id, p_session_id, p_duration, p_success_rate
      );
    END;
    $$ LANGUAGE plpgsql;`,
    
    // Function to calculate retention rate
    `CREATE OR REPLACE FUNCTION calculate_retention_rate(
      p_user_id INTEGER,
      p_days_back INTEGER DEFAULT 7
    ) RETURNS FLOAT AS $$
    DECLARE
      total_words INTEGER;
      retained_words INTEGER;
    BEGIN
      -- Count words learned in the period
      SELECT COUNT(DISTINCT word_id) INTO total_words
      FROM learning_events
      WHERE user_id = p_user_id
      AND event_type = 'word_learned'
      AND timestamp >= CURRENT_DATE - INTERVAL '%d days', p_days_back);
      
      IF total_words = 0 THEN RETURN 0; END IF;
      
      -- Count words still remembered (correct answers in recent tests)
      SELECT COUNT(DISTINCT word_id) INTO retained_words
      FROM learning_events
      WHERE user_id = p_user_id
      AND event_type = 'word_tested'
      AND success_rate >= 0.8
      AND timestamp >= CURRENT_DATE - INTERVAL '3 days'
      AND word_id IN (
        SELECT DISTINCT word_id FROM learning_events
        WHERE user_id = p_user_id AND event_type = 'word_learned'
        AND timestamp >= CURRENT_DATE - INTERVAL '%d days', p_days_back
      );
      
      RETURN retained_words::FLOAT / total_words::FLOAT;
    END;
    $$ LANGUAGE plpgsql;`,
    
    // Function to get learning velocity
    `CREATE OR REPLACE FUNCTION get_learning_velocity(
      p_user_id INTEGER,
      p_days INTEGER DEFAULT 30
    ) RETURNS FLOAT AS $$
    DECLARE
      words_per_day FLOAT;
    BEGIN
      SELECT COUNT(DISTINCT word_id)::FLOAT / p_days INTO words_per_day
      FROM learning_events
      WHERE user_id = p_user_id
      AND event_type = 'word_learned'
      AND timestamp >= CURRENT_DATE - INTERVAL '%d days', p_days);
      
      RETURN COALESCE(words_per_day, 0);
    END;
    $$ LANGUAGE plpgsql;`
  ];
  
  for (const query of analyticsQueries) {
    await client.query(query);
  }
  
  console.log('  ✅ Learning analytics functions created');
}

async function setupStatisticalAnalysis(client) {
  console.log('\n📈 Setting up statistical analysis tools...');
  
  // Create statistical analysis functions
  const statsQueries = [
    // T-test function for comparing means
    `CREATE OR REPLACE FUNCTION calculate_t_test(
      test_id_param INTEGER,
      metric_name_param VARCHAR(100)
    ) RETURNS TABLE (
      control_mean FLOAT,
      treatment_mean FLOAT,
      t_statistic FLOAT,
      p_value FLOAT,
      significant BOOLEAN
    ) AS $$
    DECLARE
      control_values FLOAT[];
      treatment_values FLOAT[];
      control_mean_val FLOAT;
      treatment_mean_val FLOAT;
      control_var FLOAT;
      treatment_var FLOAT;
      pooled_var FLOAT;
      t_stat FLOAT;
      df INTEGER;
      p_val FLOAT;
    BEGIN
      -- Get control group values
      SELECT array_agg(
        CASE metric_name_param
          WHEN 'retention_rate' THEN retention_score
          WHEN 'success_rate' THEN success_rate
          WHEN 'learning_duration' THEN learning_duration_seconds::FLOAT
        END
      ) INTO control_values
      FROM learning_events
      WHERE test_id = test_id_param AND cohort_group = 'control';
      
      -- Get treatment group values
      SELECT array_agg(
        CASE metric_name_param
          WHEN 'retention_rate' THEN retention_score
          WHEN 'success_rate' THEN success_rate
          WHEN 'learning_duration' THEN learning_duration_seconds::FLOAT
        END
      ) INTO treatment_values
      FROM learning_events
      WHERE test_id = test_id_param AND cohort_group = 'treatment';
      
      -- Calculate means
      SELECT avg(val) INTO control_mean_val FROM unnest(control_values) val;
      SELECT avg(val) INTO treatment_mean_val FROM unnest(treatment_values) val;
      
      -- Simplified t-test (in production, use proper statistical library)
      IF array_length(control_values, 1) > 30 AND array_length(treatment_values, 1) > 30 THEN
        t_stat := (treatment_mean_val - control_mean_val) / 
                  sqrt((variance(control_values) / array_length(control_values, 1)) + 
                       (variance(treatment_values) / array_length(treatment_values, 1)));
        
        -- Simplified p-value calculation (replace with proper implementation)
        p_val := CASE 
          WHEN abs(t_stat) > 2.576 THEN 0.01
          WHEN abs(t_stat) > 1.96 THEN 0.05
          WHEN abs(t_stat) > 1.645 THEN 0.1
          ELSE 0.2
        END;
      ELSE
        t_stat := 0;
        p_val := 1;
      END IF;
      
      RETURN QUERY SELECT 
        control_mean_val,
        treatment_mean_val,
        t_stat,
        p_val,
        (p_val <= 0.05);
    END;
    $$ LANGUAGE plpgsql;`,
    
    // Effect size calculation (Cohen's d)
    `CREATE OR REPLACE FUNCTION calculate_effect_size(
      test_id_param INTEGER,
      metric_name_param VARCHAR(100)
    ) RETURNS FLOAT AS $$
    DECLARE
      control_mean FLOAT;
      treatment_mean FLOAT;
      pooled_sd FLOAT;
      effect_size FLOAT;
    BEGIN
      -- Get means and standard deviations for both groups
      -- (Simplified calculation - in production use proper statistics)
      SELECT 
        avg(CASE WHEN cohort_group = 'control' THEN 
          CASE metric_name_param
            WHEN 'retention_rate' THEN retention_score
            WHEN 'success_rate' THEN success_rate
            WHEN 'learning_duration' THEN learning_duration_seconds::FLOAT
          END
        END),
        avg(CASE WHEN cohort_group = 'treatment' THEN 
          CASE metric_name_param
            WHEN 'retention_rate' THEN retention_score
            WHEN 'success_rate' THEN success_rate
            WHEN 'learning_duration' THEN learning_duration_seconds::FLOAT
          END
        END)
      INTO control_mean, treatment_mean
      FROM learning_events
      WHERE test_id = test_id_param;
      
      -- Simplified effect size calculation
      pooled_sd := 0.2; -- Placeholder - calculate proper pooled standard deviation
      effect_size := (treatment_mean - control_mean) / pooled_sd;
      
      RETURN effect_size;
    END;
    $$ LANGUAGE plpgsql;`
  ];
  
  for (const query of statsQueries) {
    await client.query(query);
  }
  
  console.log('  ✅ Statistical analysis tools setup complete');
}

async function initializeTestCohorts(client) {
  console.log('\n🎯 Initializing test cohorts and metrics...');
  
  // Create sample learning events for demonstration
  const testId = await client.query(`
    SELECT id FROM ab_tests WHERE test_name = 'vocabulary_enhancement_2024'
  `);
  
  if (testId.rows.length > 0) {
    const id = testId.rows[0].id;
    
    // Insert sample user cohort assignments
    const sampleCohorts = [
      { userId: 1001, cohort: 'control', variant: 'original_vocabulary' },
      { userId: 1002, cohort: 'treatment', variant: 'enhanced_vocabulary' },
      { userId: 1003, cohort: 'control', variant: 'original_vocabulary' },
      { userId: 1004, cohort: 'treatment', variant: 'enhanced_vocabulary' },
      { userId: 1005, cohort: 'treatment', variant: 'enhanced_vocabulary' }
    ];
    
    for (const cohort of sampleCohorts) {
      await client.query(`
        INSERT INTO user_cohorts (user_id, test_id, cohort_group, vocabulary_variant)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, test_id) DO NOTHING
      `, [cohort.userId, id, cohort.cohort, cohort.variant]);
    }
    
    // Insert sample learning events
    const sampleEvents = [
      { userId: 1001, eventType: 'word_learned', duration: 45, successRate: 0.75 },
      { userId: 1002, eventType: 'word_learned', duration: 38, successRate: 0.85 },
      { userId: 1003, eventType: 'session_completed', duration: 900, successRate: 0.70 },
      { userId: 1004, eventType: 'word_learned', duration: 35, successRate: 0.90 },
      { userId: 1005, eventType: 'level_advanced', duration: 1200, successRate: 0.88 }
    ];
    
    for (const event of sampleEvents) {
      await client.query(`
        SELECT track_learning_event($1, $2, $3, $4, $5, $6, $7)
      `, [
        event.userId,
        event.eventType,
        '{}', // event_data
        null, // word_id
        `session_${event.userId}_${Date.now()}`, // session_id
        event.duration,
        event.successRate
      ]);
    }
  }
  
  // Generate initial test results
  await generateInitialResults(client);
  
  console.log('  ✅ Test cohorts initialized with sample data');
}

async function generateInitialResults(client) {
  console.log('\n📊 Generating initial A/B test results...');
  
  const tests = await client.query(`SELECT id, test_name FROM ab_tests WHERE status = 'active'`);
  
  for (const test of tests.rows) {
    const metrics = ['retention_rate', 'success_rate', 'learning_duration'];
    
    for (const metric of metrics) {
      // Get statistical analysis
      const analysis = await client.query(`
        SELECT * FROM calculate_t_test($1, $2)
      `, [test.id, metric]);
      
      if (analysis.rows.length > 0) {
        const result = analysis.rows[0];
        const effectSize = await client.query(`
          SELECT calculate_effect_size($1, $2) as effect_size
        `, [test.id, metric]);
        
        // Insert results
        await client.query(`
          INSERT INTO ab_test_results (
            test_id, metric_name, control_value, treatment_value,
            p_value, statistical_significance, effect_size,
            sample_size_control, sample_size_treatment
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT DO NOTHING
        `, [
          test.id,
          metric,
          result.control_mean,
          result.treatment_mean,
          result.p_value,
          result.significant,
          effectSize.rows[0]?.effect_size || 0,
          50, // sample_size_control (placeholder)
          50  // sample_size_treatment (placeholder)
        ]);
      }
    }
  }
  
  // Display results summary
  const results = await client.query(`
    SELECT 
      at.test_name,
      atr.metric_name,
      atr.control_value,
      atr.treatment_value,
      atr.p_value,
      atr.statistical_significance,
      atr.effect_size
    FROM ab_test_results atr
    JOIN ab_tests at ON atr.test_id = at.id
    ORDER BY at.test_name, atr.metric_name
  `);
  
  console.log('\nA/B Test Results Summary:');
  console.log('-'.repeat(80));
  
  let currentTest = null;
  for (const result of results.rows) {
    if (result.test_name !== currentTest) {
      console.log(`\n${result.test_name.toUpperCase()}:`);
      currentTest = result.test_name;
    }
    
    const improvement = ((result.treatment_value - result.control_value) / result.control_value * 100);
    const significance = result.statistical_significance ? '✅ Significant' : '❌ Not Significant';
    
    console.log(`  ${result.metric_name}:`);
    console.log(`    Control: ${result.control_value?.toFixed(3) || 'N/A'}`);
    console.log(`    Treatment: ${result.treatment_value?.toFixed(3) || 'N/A'}`);
    console.log(`    Improvement: ${improvement?.toFixed(1) || 'N/A'}%`);
    console.log(`    P-value: ${result.p_value?.toFixed(3) || 'N/A'}`);
    console.log(`    Effect Size: ${result.effect_size?.toFixed(3) || 'N/A'}`);
    console.log(`    ${significance}`);
  }
  
  console.log('\n🎉 A/B TESTING FRAMEWORK SETUP COMPLETE!');
  console.log('Ready to track and analyze vocabulary enhancement effectiveness!');
}

if (require.main === module) {
  setupABTesting().catch(console.error);
}

module.exports = { 
  setupABTesting, 
  setupABTestingSchema,
  createVocabularyCohorts 
};