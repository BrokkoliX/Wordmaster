/**
 * Add missing English translations from Wiktionary data
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'words_30k_spanish.json');
const wiktPath = path.join(__dirname, '../../data/kaikki/Spanish.jsonl');

async function parseWiktionary() {
  console.log('📖 Parsing Wiktionary for translations...');
  
  const translations = {};
  let lineCount = 0;
  
  if (!fs.existsSync(wiktPath)) {
    console.log('⚠️  Wiktionary file not found');
    return translations;
  }
  
  const fileStream = fs.createReadStream(wiktPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    lineCount++;
    if (lineCount % 50000 === 0) {
      process.stdout.write(`\r  Processed ${lineCount.toLocaleString()} entries, found ${Object.keys(translations).length.toLocaleString()} translations`);
    }
    
    try {
      const entry = JSON.parse(line);
      const spanishWord = entry.word;
      
      if (entry.translations) {
        for (const trans of entry.translations) {
          if (trans.lang_code === 'en' || trans.lang === 'Inglés') {
            if (!translations[spanishWord]) {
              translations[spanishWord] = [];
            }
            if (!translations[spanishWord].includes(trans.word)) {
              translations[spanishWord].push(trans.word);
            }
          }
        }
      }
    } catch (e) {
      // Skip malformed lines
    }
  }
  
  console.log(`\n✅ Found translations for ${Object.keys(translations).length.toLocaleString()} Spanish words`);
  return translations;
}

async function main() {
  console.log('🔧 Adding missing translations to JSON file\n');
  
  // Load current JSON
  const words = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📚 Loaded ${words.length.toLocaleString()} words`);
  
  //Count placeholders
  const placeholders = words.filter(w => w.source_word && w.source_word.startsWith('[TRANSLATE'));
  console.log(`⚠️  Found ${placeholders.length.toLocaleString()} words needing translation\n`);
  
  // Get Wiktionary translations
  const translations = await parseWiktionary();
  
  // Apply translations
  console.log('\n🔄 Applying translations...');
  let fixed = 0;
  let stillMissing = 0;
  
  for (const word of words) {
    if (word.source_word && word.source_word.startsWith('[TRANSLATE')) {
      const spanishWord = word.target_word;
      
      if (translations[spanishWord] && translations[spanishWord].length > 0) {
        // Use first (most common) translation
        word.source_word = translations[spanishWord][0];
        fixed++;
      } else {
        stillMissing++;
      }
    }
  }
  
  console.log(`✅ Fixed ${fixed.toLocaleString()} translations`);
  console.log(`⚠️  Still missing: ${stillMissing.toLocaleString()} translations`);
  
  // Save updated file
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'words_30k_translated.json');
  fs.writeFileSync(outputPath, JSON.stringify(words, null, 2));
  console.log(`\n💾 Saved to: words_30k_translated.json`);
  
  // Also update the original
  fs.writeFileSync(jsonPath, JSON.stringify(words, null, 2));
  console.log(`💾 Updated: words_30k_spanish.json`);
  
  console.log('\n🎉 Done! Restart the app to see translations.');
}

main().catch(console.error);
