/**
 * Check Database Status
 * This script helps debug word loading issues
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🔍 Checking Database Status\n');

// Check for database files
const possibleDbPaths = [
  path.join(__dirname, 'wordmaster.db'),
  path.join(__dirname, 'WordMasterApp', 'wordmaster.db'),
  path.join(__dirname, '.expo', 'wordmaster.db')
];

console.log('Looking for database files...');
possibleDbPaths.forEach(dbPath => {
  if (fs.existsSync(dbPath)) {
    console.log(`✅ Found database at: ${dbPath}`);
    
    try {
      const db = new sqlite3(dbPath);
      
      // Check word count
      const wordCount = db.prepare('SELECT COUNT(*) as count FROM words').get();
      console.log(`   Total words: ${wordCount.count.toLocaleString()}`);
      
      // Check CEFR breakdown
      const cefrStats = db.prepare(`
        SELECT cefr_level, COUNT(*) as count 
        FROM words 
        GROUP BY cefr_level 
        ORDER BY cefr_level
      `).all();
      
      console.log('   Words by CEFR level:');
      cefrStats.forEach(s => {
        console.log(`     ${s.cefr_level}: ${s.count.toLocaleString()}`);
      });
      
      // Sample words
      const samples = db.prepare(`
        SELECT word, translation, cefr_level
        FROM words
        ORDER BY frequency_rank
        LIMIT 5
      `).all();
      
      console.log('   Sample words:');
      samples.forEach((w, i) => {
        console.log(`     ${i+1}. ${w.translation} → ${w.word} (${w.cefr_level})`);
      });
      
      db.close();
    } catch (error) {
      console.log(`   ❌ Error reading database: ${error.message}`);
    }
    
    console.log('');
  }
});

// Check for JSON data files
console.log('\nLooking for JSON data files...');
const possibleJsonPaths = [
  path.join(__dirname, 'src', 'data', 'words_translated.json'),
  path.join(__dirname, 'WordMasterApp', 'src', 'data', 'words_translated.json'),
  path.join(__dirname, 'src', 'data', 'words_30k_spanish.json'),
  path.join(__dirname, 'src', 'data', 'words_30k_translated.json')
];

possibleJsonPaths.forEach(jsonPath => {
  if (fs.existsSync(jsonPath)) {
    console.log(`✅ Found JSON at: ${jsonPath}`);
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      console.log(`   Total words: ${data.length.toLocaleString()}`);
      
      // Sample
      if (data.length > 0) {
        const sample = data[0];
        console.log(`   Sample: ${sample.source_word || sample.translation} → ${sample.target_word || sample.word}`);
      }
    } catch (error) {
      console.log(`   ❌ Error reading JSON: ${error.message}`);
    }
    console.log('');
  }
});

console.log('\n📋 Summary:');
console.log('If you see databases with 0 words but JSON files with data,');
console.log('the app needs to import the JSON data on first launch.');
console.log('\nIf the app shows no words:');
console.log('1. Make sure the database file is in the correct location');
console.log('2. Check that words_translated.json exists and has data');
console.log('3. Try resetting the app storage to trigger re-import');
console.log('4. Check console logs for import errors\n');
