/**
 * Translate FrequencyWords lists to create proper language data
 * Uses DeepL API (free tier) or OpenAI GPT-4
 * 
 * Usage:
 *   node translateFrequencyWords.js --lang=fr --api=deepl
 *   node translateFrequencyWords.js --lang=de --api=openai
 *   node translateFrequencyWords.js --lang=hu --api=deepl
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG = {
  DEEPL_API_KEY: process.env.DEEPL_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  WORDS_LIMIT: 30000,
  BATCH_SIZE: 50, // DeepL can handle 50 at once
  RATE_LIMIT_MS: 1000, // Wait 1 second between batches
};

// CEFR level assignments (same as Spanish)
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
    code: 'FR',
    flag: '🇫🇷',
    frequencyFile: '../../../FrequencyWords/content/2018/fr/fr_50k.txt'
  },
  de: { 
    name: 'German', 
    code: 'DE',
    flag: '🇩🇪',
    frequencyFile: '../../../FrequencyWords/content/2018/de/de_50k.txt'
  },
  hu: { 
    name: 'Hungarian', 
    code: 'HU',
    flag: '🇭🇺',
    frequencyFile: '../../../FrequencyWords/content/2018/hu/hu_50k.txt'
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Read frequency word list from file
 */
function readFrequencyFile(filePath, limit = 30000) {
  const absolutePath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}\n\nPlease clone FrequencyWords:\n  git clone https://github.com/hermitdave/FrequencyWords.git`);
  }
  
  console.log(`📖 Reading: ${absolutePath}`);
  
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  const words = [];
  for (let i = 0; i < Math.min(lines.length, limit); i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts[0]) {
      words.push({
        word: parts[0],
        frequency: parseInt(parts[1]) || 0,
        rank: i + 1
      });
    }
  }
  
  console.log(`✅ Loaded ${words.length.toLocaleString()} words\n`);
  return words;
}

/**
 * Translate using DeepL API
 */
async function translateWithDeepL(words, sourceLang, targetLang = 'EN') {
  const API_KEY = CONFIG.DEEPL_API_KEY;
  
  if (!API_KEY) {
    throw new Error('DEEPL_API_KEY environment variable not set!\n\nGet free API key: https://www.deepl.com/pro-api');
  }
  
  const url = 'https://api-free.deepl.com/v2/translate';
  
  try {
    const text = words.map(w => w.word).join('\n');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        source_lang: sourceLang,
        target_lang: targetLang,
        split_sentences: '0',
        preserve_formatting: '1'
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepL API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const translations = data.translations[0].text.split('\n');
    
    return translations;
  } catch (error) {
    console.error('❌ DeepL translation error:', error.message);
    throw error;
  }
}

/**
 * Translate using OpenAI GPT-4
 */
async function translateWithOpenAI(words, sourceLang, targetLang = 'English') {
  const API_KEY = CONFIG.OPENAI_API_KEY;
  
  if (!API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable not set!\n\nGet API key: https://platform.openai.com/api-keys');
  }
  
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const wordsText = words.map((w, i) => `${i + 1}. ${w.word}`).join('\n');
  
  const prompt = `Translate these ${sourceLang} words to ${targetLang}. Return ONLY the translations, one per line, in the same order. Use the most common/basic translation for each word.

${wordsText}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a professional translator. Provide simple, common translations suitable for language learners.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const translationsText = data.choices[0].message.content.trim();
    
    // Parse numbered list or plain list
    const translations = translationsText
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
    
    return translations;
  } catch (error) {
    console.error('❌ OpenAI translation error:', error.message);
    throw error;
  }
}

/**
 * Main translation function
 */
async function translateLanguage(langCode, apiType = 'deepl') {
  const lang = LANGUAGES[langCode];
  if (!lang) {
    throw new Error(`Unknown language: ${langCode}. Available: fr, de, hu`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${lang.flag} Translating ${lang.name} to English`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Read frequency words
  const words = readFrequencyFile(lang.frequencyFile, CONFIG.WORDS_LIMIT);
  
  // Translate in batches
  const batchSize = apiType === 'openai' ? 50 : CONFIG.BATCH_SIZE;
  const totalBatches = Math.ceil(words.length / batchSize);
  const translatedWords = [];
  
  console.log(`🔄 Translating ${words.length.toLocaleString()} words in ${totalBatches} batches...`);
  console.log(`   API: ${apiType.toUpperCase()}\n`);
  
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    console.log(`   Batch ${batchNum}/${totalBatches} (words ${i + 1}-${i + batch.length})...`);
    
    try {
      let translations;
      
      if (apiType === 'deepl') {
        translations = await translateWithDeepL(batch, lang.code);
      } else if (apiType === 'openai') {
        translations = await translateWithOpenAI(batch, lang.name);
      } else {
        throw new Error(`Unknown API type: ${apiType}`);
      }
      
      // Create word objects
      batch.forEach((word, idx) => {
        const rank = i + idx + 1;
        const { level, difficulty } = assignCEFR(rank);
        
        translatedWords.push({
          id: `${langCode}_${rank}`,
          source_word: translations[idx] || `[MISSING]`,
          target_word: word.word,
          difficulty,
          category: 'general',
          frequency_rank: rank,
          cefr_level: level,
          source_lang: 'en',
          target_lang: langCode
        });
      });
      
      // Rate limiting
      if (batchNum < totalBatches) {
        await sleep(CONFIG.RATE_LIMIT_MS);
      }
      
    } catch (error) {
      console.error(`   ❌ Batch ${batchNum} failed:`, error.message);
      console.log(`   Stopping at word ${i}. Partial results will be saved.`);
      break;
    }
  }
  
  console.log(`\n✅ Translated ${translatedWords.length.toLocaleString()} words\n`);
  
  // Show CEFR distribution
  const cefrCounts = {};
  translatedWords.forEach(w => {
    cefrCounts[w.cefr_level] = (cefrCounts[w.cefr_level] || 0) + 1;
  });
  
  console.log('CEFR Distribution:');
  Object.entries(cefrCounts).forEach(([level, count]) => {
    console.log(`   ${level}: ${count.toLocaleString()} words`);
  });
  
  // Show sample
  console.log('\nSample translations (first 10):');
  translatedWords.slice(0, 10).forEach((w, i) => {
    console.log(`   ${i + 1}. ${w.target_word} = ${w.source_word} (${w.cefr_level})`);
  });
  
  // Save to JSON
  const outputDir = path.join(__dirname, '..', 'src', 'data');
  const outputFile = path.join(outputDir, `words_${lang.name.toLowerCase()}.json`);
  
  fs.writeFileSync(outputFile, JSON.stringify(translatedWords, null, 2), 'utf-8');
  
  const fileSizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
  console.log(`\n💾 Saved to: ${outputFile} (${fileSizeMB} MB)`);
  
  // Also create reverse pair (e.g., French→English)
  const reversedWords = translatedWords.map(w => ({
    ...w,
    id: `${langCode}-en_${w.frequency_rank}`,
    source_word: w.target_word,
    target_word: w.source_word,
    source_lang: langCode,
    target_lang: 'en'
  }));
  
  const reverseFile = path.join(outputDir, `words_${lang.name.toLowerCase()}_to_english.json`);
  fs.writeFileSync(reverseFile, JSON.stringify(reversedWords, null, 2), 'utf-8');
  console.log(`💾 Saved reverse pair: ${reverseFile}\n`);
  
  console.log(`${'='.repeat(60)}`);
  console.log('✅ TRANSLATION COMPLETE');
  console.log(`${'='.repeat(60)}\n`);
  
  return translatedWords;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    lang: 'fr',
    api: 'deepl'
  };
  
  args.forEach(arg => {
    const [key, value] = arg.replace('--', '').split('=');
    if (key === 'lang') config.lang = value;
    if (key === 'api') config.api = value;
  });
  
  return config;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🌍 FrequencyWords Translation Tool\n');
  
  const args = parseArgs();
  
  console.log('Configuration:');
  console.log(`  Language: ${args.lang}`);
  console.log(`  API: ${args.api}`);
  console.log(`  Words limit: ${CONFIG.WORDS_LIMIT.toLocaleString()}`);
  console.log(`  Batch size: ${CONFIG.BATCH_SIZE}`);
  
  // Check API keys
  if (args.api === 'deepl' && !CONFIG.DEEPL_API_KEY) {
    console.error('\n❌ Error: DEEPL_API_KEY not set!');
    console.log('\nSet it with:');
    console.log('  export DEEPL_API_KEY="your-key-here"');
    console.log('\nGet free API key: https://www.deepl.com/pro-api');
    process.exit(1);
  }
  
  if (args.api === 'openai' && !CONFIG.OPENAI_API_KEY) {
    console.error('\n❌ Error: OPENAI_API_KEY not set!');
    console.log('\nSet it with:');
    console.log('  export OPENAI_API_KEY="your-key-here"');
    console.log('\nGet API key: https://platform.openai.com/api-keys');
    process.exit(1);
  }
  
  try {
    await translateLanguage(args.lang, args.api);
    
    console.log('\n🎉 Next steps:');
    console.log('   1. Review the generated JSON files');
    console.log('   2. Run: node scripts/exportLanguagesToJSON.js');
    console.log('   3. Uncomment language in src/screens/SettingsScreen.js');
    console.log('   4. Test in the app!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { translateLanguage, readFrequencyFile };
