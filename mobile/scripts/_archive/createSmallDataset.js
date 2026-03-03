/**
 * Create a smaller dataset with only properly translated words
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'src', 'data', 'words_30k_spanish.json');
const outputPath = path.join(__dirname, '..', 'src', 'data', 'words_translated.json');

console.log('📚 Loading full dataset...');
const allWords = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

console.log(`   Total words: ${allWords.length.toLocaleString()}`);

// Filter to only words with real translations
const translated = allWords.filter(w => {
  return w.source_word && 
         w.source_word.trim() !== '' && 
         !w.source_word.startsWith('[TRANSLATE');
});

console.log(`   Properly translated: ${translated.length.toLocaleString()}`);

// Count by CEFR level
const byLevel = {};
translated.forEach(w => {
  byLevel[w.cefr_level] = (byLevel[w.cefr_level] || 0) + 1;
});

console.log('\n📊 Words by CEFR level:');
Object.entries(byLevel).sort().forEach(([level, count]) => {
  console.log(`   ${level}: ${count} words`);
});

// Save smaller file
fs.writeFileSync(outputPath, JSON.stringify(translated, null, 2));

console.log(`\n💾 Saved ${translated.length} words to: words_translated.json`);
console.log(`   File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);

// Show some examples
console.log('\n📝 Sample words:');
translated.slice(0, 10).forEach((w, i) => {
  console.log(`   ${i + 1}. ${w.target_word} → ${w.source_word} (${w.cefr_level})`);
});

console.log('\n✅ Done! Update importWords.js to use words_translated.json');
