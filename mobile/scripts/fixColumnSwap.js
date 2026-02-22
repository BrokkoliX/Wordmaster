/**
 * Fix the word/translation swap in database
 * The JSON has: source_word=English, target_word=Spanish
 * But we need: word=Spanish (what we're learning), translation=English (what we know)
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wordmaster.db');
const db = new sqlite3(dbPath);

console.log('🔧 Fixing word/translation columns...\n');

// Check current state
const sample = db.prepare('SELECT id, word, translation, cefr_level FROM words LIMIT 1').get();
console.log('Before fix:');
console.log(`  word: "${sample.word}"`);
console.log(`  translation: "${sample.translation}"`);

// The fix: Update ALL rows to swap word and translation
console.log('\n🔄 Swapping columns...');

try {
  db.exec('BEGIN TRANSACTION');
  
  // Use a single UPDATE with subquery
  db.exec(`
    UPDATE words
    SET 
      word = translation,
      translation = (
        SELECT word FROM (SELECT id, word FROM words) AS old_words 
        WHERE old_words.id = words.id
      )
  `);
  
  db.exec('COMMIT');
  
  console.log('✅ Swap complete!');
} catch (error) {
  console.error('❌ Error during swap:', error.message);
  db.exec('ROLLBACK');
  process.exit(1);
}

// Verify the fix
const fixed = db.prepare('SELECT word, translation, cefr_level FROM words LIMIT 10').all();
console.log('\n✅ After fix (first 10 words):');
fixed.forEach((row, i) => {
  console.log(`  ${i + 1}. ${row.word} → ${row.translation} (${row.cefr_level})`);
});

// Count by CEFR level
const stats = db.prepare(`
  SELECT cefr_level, COUNT(*) as count
  FROM words
  GROUP BY cefr_level
  ORDER BY cefr_level
`).all();

console.log('\n📊 Words by level:');
stats.forEach(s => {
  console.log(`  ${s.cefr_level}: ${s.count.toLocaleString()} words`);
});

db.close();

console.log('\n🎉 Database fixed! App should work now!');
