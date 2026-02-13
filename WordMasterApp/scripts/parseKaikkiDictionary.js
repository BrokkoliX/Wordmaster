/**
 * Parse Kaikki.org Wiktionary dictionaries and create word translation files
 * Matches with FrequencyWords rankings to assign CEFR levels
 * 
 * Usage: node parseKaikkiDictionary.js --lang=fr
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// CEFR level assignments based on frequency rank
const CEFR_LEVELS = {
  A1: { min: 1, max: 500, difficulty: 1 },
  A2: { min: 501, max: 1500, difficulty: 2 },
  B1: { min: 1501, max: 3000, difficulty: 3 },
  B2: { min: 3001, max: 6000, difficulty: 5 },
  C1: { min: 6001, max: 12000, difficulty: 7 },
  C2: { min: 12001, max: 30000, difficulty: 9 }
};

// Language configurations
const LANGUAGES = {
  fr: {
    name: 'French',
    flag: '🇫🇷',
    frequencyFile: '../../FrequencyWords/content/2018/fr/fr_50k.txt',
    kaikkiFile: '../../dictionaries/french.jsonl',
    outputFile: 'words_french.json',
    reverseFile: 'words_french_to_english.json'
  },
  de: {
    name: 'German',
    flag: '🇩🇪',
    frequencyFile: '../../FrequencyWords/content/2018/de/de_50k.txt',
    kaikkiFile: '../../dictionaries/german.jsonl',
    outputFile: 'words_german.json',
    reverseFile: 'words_german_to_english.json'
  },
  hu: {
    name: 'Hungarian',
    flag: '🇭🇺',
    frequencyFile: '../../FrequencyWords/content/2018/hu/hu_50k.txt',
    kaikkiFile: '../../dictionaries/hungarian.jsonl',
    outputFile: 'words_hungarian.json',
    reverseFile: 'words_hungarian_to_english.json'
  }
};

function assignCEFR(rank) {
  for (const [level, range] of Object.entries(CEFR_LEVELS)) {
    if (rank >= range.min && rank <= range.max) {
      return { level, difficulty: range.difficulty };
    }
  }
  return { level: 'C2', difficulty: 9 };
}

/**
 * Read frequency words from FrequencyWords file
 */
function readFrequencyWords(filePath, limit = 30000) {
  const absolutePath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Frequency file not found: ${absolutePath}`);
  }
  
  console.log(`📖 Reading frequency list: ${absolutePath}`);
  
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  const words = new Map();
  for (let i = 0; i < Math.min(lines.length, limit); i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts[0]) {
      words.set(parts[0].toLowerCase(), {
        word: parts[0],
        frequency: parseInt(parts[1]) || 0,
        rank: i + 1
      });
    }
  }
  
  console.log(`✅ Loaded ${words.size.toLocaleString()} frequency words\n`);
  return words;
}

/**
 * Extract English translations from Kaikki.org dictionary entry
 */
function extractTranslations(entry) {
  const translations = new Set();
  
  try {
    // Check for glosses (main translation field)
    if (entry.senses && Array.isArray(entry.senses)) {
      entry.senses.forEach(sense => {
        if (sense.glosses && Array.isArray(sense.glosses)) {
          sense.glosses.forEach(gloss => {
            if (gloss && typeof gloss === 'string') {
              // Clean up the gloss
              let clean = gloss
                .replace(/\(.*?\)/g, '') // Remove parenthetical notes
                .replace(/\[.*?\]/g, '') // Remove bracketed notes
                .split(/[;,]/)           // Split on semicolon or comma
                .map(t => t.trim())
                .filter(t => t.length > 0 && t.length < 50); // Reasonable length
              
              clean.forEach(t => translations.add(t));
            }
          });
        }
        
        // Also check raw_glosses
        if (sense.raw_glosses && Array.isArray(sense.raw_glosses)) {
          sense.raw_glosses.forEach(gloss => {
            if (gloss && typeof gloss === 'string' && gloss.length < 50) {
              translations.add(gloss.trim());
            }
          });
        }
      });
    }
    
    // Check for head templates (sometimes have translations)
    if (entry.translations && Array.isArray(entry.translations)) {
      entry.translations.forEach(trans => {
        if (trans.lang === 'en' && trans.word) {
          translations.add(trans.word);
        }
      });
    }
  } catch (error) {
    // Skip entries with parsing errors
  }
  
  // Return the first (most common) translation, or combine top 2
  const translationArray = Array.from(translations);
  if (translationArray.length === 0) return null;
  if (translationArray.length === 1) return translationArray[0];
  
  // If multiple translations, combine top 2 with "/"
  return translationArray.slice(0, 2).join('/');
}

/**
 * Parse Kaikki.org JSONL dictionary file
 */
async function parseKaikkiDictionary(kaikkiPath) {
  const absolutePath = path.join(__dirname, kaikkiPath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Kaikki dictionary not found: ${absolutePath}\n\nPlease download it first!`);
  }
  
  console.log(`📖 Parsing Kaikki dictionary: ${absolutePath}`);
  console.log(`   This may take a few minutes...\n`);
  
  const dictionary = new Map();
  let lineCount = 0;
  let parsedCount = 0;
  
  const fileStream = fs.createReadStream(absolutePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    lineCount++;
    
    if (lineCount % 50000 === 0) {
      console.log(`   Processed ${lineCount.toLocaleString()} entries...`);
    }
    
    try {
      const entry = JSON.parse(line);
      
      if (!entry.word) continue;
      
      const word = entry.word.toLowerCase();
      const translation = extractTranslations(entry);
      
      if (translation) {
        // Keep the best translation (first one found, usually most common)
        if (!dictionary.has(word)) {
          dictionary.set(word, {
            word: entry.word,
            translation: translation,
            pos: entry.pos || 'unknown'
          });
          parsedCount++;
        }
      }
    } catch (error) {
      // Skip malformed JSON lines
    }
  }
  
  console.log(`\n✅ Parsed ${lineCount.toLocaleString()} entries`);
  console.log(`   Found ${parsedCount.toLocaleString()} words with English translations\n`);
  
  return dictionary;
}

/**
 * Generate final word list by matching frequency + translations
 */
async function generateWordList(langCode) {
  const lang = LANGUAGES[langCode];
  if (!lang) {
    throw new Error(`Unknown language: ${langCode}. Available: fr, de, hu`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${lang.flag} Generating ${lang.name}-English Word List`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Step 1: Read frequency words
  const frequencyWords = readFrequencyWords(lang.frequencyFile, 30000);
  
  // Step 2: Parse Kaikki dictionary
  const dictionary = await parseKaikkiDictionary(lang.kaikkiFile);
  
  // Step 3: Match and generate output
  console.log('🔄 Matching frequency list with translations...\n');
  
  const translatedWords = [];
  let matchCount = 0;
  let missingCount = 0;
  const missingWords = [];
  
  frequencyWords.forEach((freqData, word) => {
    const rank = freqData.rank;
    const { level, difficulty } = assignCEFR(rank);
    
    const dictEntry = dictionary.get(word);
    
    let translation;
    if (dictEntry) {
      translation = dictEntry.translation;
      matchCount++;
    } else {
      // Mark as needing translation
      translation = `[NEED:${freqData.word}]`;
      missingCount++;
      if (missingWords.length < 100) {
        missingWords.push(freqData.word);
      }
    }
    
    translatedWords.push({
      id: `${langCode}_${rank}`,
      source_word: translation,
      target_word: freqData.word,
      difficulty,
      category: 'general',
      frequency_rank: rank,
      cefr_level: level,
      source_lang: 'en',
      target_lang: langCode
    });
  });
  
  // Sort by frequency rank
  translatedWords.sort((a, b) => a.frequency_rank - b.frequency_rank);
  
  // Stats
  console.log('📊 Translation Coverage:');
  console.log(`   ✅ Matched: ${matchCount.toLocaleString()} (${((matchCount/translatedWords.length)*100).toFixed(1)}%)`);
  console.log(`   ❌ Missing: ${missingCount.toLocaleString()} (${((missingCount/translatedWords.length)*100).toFixed(1)}%)`);
  
  if (missingWords.length > 0) {
    console.log(`\n⚠️  Sample missing words (first 20):`);
    missingWords.slice(0, 20).forEach((w, i) => {
      console.log(`   ${i + 1}. ${w}`);
    });
  }
  
  // CEFR distribution
  const cefrCounts = {};
  translatedWords.forEach(w => {
    cefrCounts[w.cefr_level] = (cefrCounts[w.cefr_level] || 0) + 1;
  });
  
  console.log('\n📚 CEFR Distribution:');
  Object.entries(cefrCounts).forEach(([level, count]) => {
    console.log(`   ${level}: ${count.toLocaleString()} words`);
  });
  
  // Sample
  console.log('\n📝 Sample (first 20 words):');
  translatedWords.slice(0, 20).forEach((w, i) => {
    const status = w.source_word.startsWith('[NEED:') ? '❌' : '✅';
    console.log(`   ${status} ${i + 1}. ${w.target_word} = ${w.source_word} (${w.cefr_level}, rank ${w.frequency_rank})`);
  });
  
  // Save to JSON
  const outputDir = path.join(__dirname, '..', 'src', 'data');
  const outputPath = path.join(outputDir, lang.outputFile);
  
  fs.writeFileSync(outputPath, JSON.stringify(translatedWords, null, 2), 'utf-8');
  const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
  console.log(`\n💾 Saved: ${outputPath} (${fileSizeMB} MB)`);
  
  // Create reverse pair
  const reversedWords = translatedWords.map(w => ({
    ...w,
    id: `${langCode}-en_${w.frequency_rank}`,
    source_word: w.target_word,
    target_word: w.source_word,
    source_lang: langCode,
    target_lang: 'en'
  }));
  
  const reversePath = path.join(outputDir, lang.reverseFile);
  fs.writeFileSync(reversePath, JSON.stringify(reversedWords, null, 2), 'utf-8');
  console.log(`💾 Saved reverse: ${reversePath}\n`);
  
  console.log(`${'='.repeat(60)}`);
  console.log('✅ GENERATION COMPLETE');
  console.log(`${'='.repeat(60)}\n`);
  
  return {
    total: translatedWords.length,
    matched: matchCount,
    missing: missingCount,
    coverage: (matchCount / translatedWords.length) * 100
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { lang: 'fr' };
  
  args.forEach(arg => {
    const [key, value] = arg.replace('--', '').split('=');
    if (key === 'lang') config.lang = value;
  });
  
  return config;
}

async function main() {
  console.log('\n🌍 Kaikki.org Dictionary Parser\n');
  console.log('Generating translation files from Wiktionary data\n');
  
  const args = parseArgs();
  
  console.log('Configuration:');
  console.log(`  Language: ${args.lang}`);
  console.log(`  Source: Kaikki.org Wiktionary data`);
  console.log(`  Words: 30,000 per language\n`);
  
  try {
    const stats = await generateWordList(args.lang);
    
    console.log('\n🎉 Success!');
    console.log(`\n📊 Final Stats:`);
    console.log(`   Total words: ${stats.total.toLocaleString()}`);
    console.log(`   Translated: ${stats.matched.toLocaleString()} (${stats.coverage.toFixed(1)}%)`);
    console.log(`   Missing: ${stats.missing.toLocaleString()}`);
    
    if (stats.missing > 0) {
      console.log(`\n💡 For missing words, you can:`);
      console.log(`   1. Accept as-is (missing words are often rare/technical)`);
      console.log(`   2. Run translateFrequencyWords.js with API to fill gaps`);
      console.log(`   3. Manually add common ones you notice`);
    }
    
    console.log(`\n🎯 Next steps:`);
    console.log(`   1. Review the generated JSON files`);
    console.log(`   2. Test in app (uncomment language in SettingsScreen.js)`);
    console.log(`   3. Repeat for other languages (de, hu)`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('  1. FrequencyWords repository is cloned');
    console.error('  2. Kaikki.org dictionaries are downloaded to dictionaries/');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateWordList, parseKaikkiDictionary };
