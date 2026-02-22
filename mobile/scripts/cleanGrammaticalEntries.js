/**
 * Clean existing database by removing grammatical description entries
 * Run this after updating an existing database to remove problematic entries
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wordmaster.db');

try {
  const db = new sqlite3(dbPath);
  
  console.log('🧹 Cleaning grammatical description entries from database...\n');
  
  // Count entries before cleaning
  const beforeCount = db.prepare('SELECT COUNT(*) as count FROM words').get();
  console.log(`📊 Total words before cleaning: ${beforeCount.count.toLocaleString()}`);
  
  // Remove entries with grammatical descriptions
  const deleteStmt = db.prepare(`
    DELETE FROM words
    WHERE 
      translation LIKE '%nominative%'
      OR translation LIKE '%accusative%'
      OR translation LIKE '%dative%'
      OR translation LIKE '%genitive%'
      OR translation LIKE '%inflection of%'
      OR translation LIKE '%conjugation of%'
      OR translation LIKE '%declension of%'
      OR translation LIKE '%form of%'
      OR translation LIKE '%singular of%'
      OR translation LIKE '%plural of%'
      OR translation LIKE '%masculine%'
      OR translation LIKE '%feminine%'
      OR translation LIKE '%neuter%'
      OR translation LIKE '%past tense%'
      OR translation LIKE '%present tense%'
      OR translation LIKE '%comparative of%'
      OR translation LIKE '%superlative of%'
      OR translation LIKE '%disjunctive form%'
      OR translation LIKE '%alternative form%'
      OR word LIKE '%nominative%'
      OR word LIKE '%accusative%'
      OR word LIKE '%dative%'
      OR word LIKE '%genitive%'
      OR LENGTH(translation) > 100
  `);
  
  const result = deleteStmt.run();
  console.log(`🗑️  Removed ${result.changes.toLocaleString()} grammatical entries`);
  
  // Count entries after cleaning
  const afterCount = db.prepare('SELECT COUNT(*) as count FROM words').get();
  console.log(`📊 Total words after cleaning: ${afterCount.count.toLocaleString()}\n`);
  
  // Show some examples of what remains
  console.log('📝 Sample words after cleaning (first 10):');
  const samples = db.prepare(`
    SELECT word, translation, cefr_level, target_lang
    FROM words
    ORDER BY frequency_rank
    LIMIT 10
  `).all();
  
  samples.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.word} → ${row.translation} (${row.target_lang}, ${row.cefr_level})`);
  });
  
  // Show breakdown by language
  console.log('\n🌍 Words by language after cleaning:');
  const langStats = db.prepare(`
    SELECT target_lang, COUNT(*) as count
    FROM words
    GROUP BY target_lang
    ORDER BY count DESC
  `).all();
  
  langStats.forEach(s => {
    console.log(`   ${s.target_lang}: ${s.count.toLocaleString()} words`);
  });
  
  // Clean up orphaned progress entries
  console.log('\n🧹 Cleaning orphaned progress entries...');
  const cleanProgress = db.prepare(`
    DELETE FROM user_word_progress
    WHERE word_id NOT IN (SELECT id FROM words)
  `);
  
  const progressResult = cleanProgress.run();
  if (progressResult.changes > 0) {
    console.log(`   Removed ${progressResult.changes} orphaned progress entries`);
  } else {
    console.log('   No orphaned progress entries found');
  }
  
  db.close();
  
  console.log('\n✅ Database cleaned successfully!');
  console.log('💡 Tip: Regenerate the database from clean source data for best results');
  
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('❌ Database file not found at:', dbPath);
    console.log('💡 Run createCorrectDatabase.js first to create the database');
  } else {
    console.error('❌ Error cleaning database:', error.message);
  }
  process.exit(1);
}
