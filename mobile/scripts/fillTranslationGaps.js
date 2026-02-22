#!/usr/bin/env node

/**
 * Fill Translation Gaps for A1-B1 Words
 * Uses OpenAI GPT-4 to translate placeholder words
 * 
 * Focus: Most important beginner words (first 3000)
 * Cost: ~$1 for all languages
 * 
 * Usage:
 *   export OPENAI_API_KEY="your-key"
 *   node fillTranslationGaps.js --lang=fr
 *   node fillTranslationGaps.js --lang=de
 *   node fillTranslationGaps.js --lang=hu
 *   node fillTranslationGaps.js --lang=all
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LANGUAGES = {
  'fr': { name: 'French', file: 'words_french.json', reverseFile: 'words_french_to_english.json' },
  'de': { name: 'German', file: 'words_german.json', reverseFile: 'words_german_to_english.json' },
  'hu': { name: 'Hungarian', file: 'words_hungarian.json', reverseFile: 'words_hungarian_to_english.json' }
};

const A1_B1_LIMIT = 3000; // First 3000 words (A1-B1 level)
const BATCH_SIZE = 50; // Translate 50 words at a time

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    lang: 'all',
    dryRun: false
  };

  args.forEach(arg => {
    if (arg.startsWith('--lang=')) {
      options.lang = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  });

  return options;
}

// Check for OpenAI API key
function checkAPIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY environment variable not set');
    console.error('');
    console.error('Please set your OpenAI API key:');
    console.error('  export OPENAI_API_KEY="sk-..."');
    console.error('');
    console.error('Get your key at: https://platform.openai.com/api-keys');
    process.exit(1);
  }
  
  return apiKey;
}

// Translate words using OpenAI GPT-4
async function translateBatch(words, sourceLang, targetLang, apiKey) {
  const wordsToTranslate = words.map(w => w.word).join(', ');
  
  const prompt = `You are a professional translator. Translate these ${sourceLang} words to ${targetLang}.

IMPORTANT RULES:
1. Return ONLY a JSON array with exact same order
2. Format: [{"word": "${sourceLang} word", "translation": "${targetLang} translation"}]
3. Keep it concise - just the main translation (1-3 words)
4. For common words, use the most common meaning
5. No explanations, no extra text

Words to translate (in order):
${wordsToTranslate}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Always return valid JSON arrays with translations. Be concise and accurate.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Parse JSON response
    let translations;
    try {
      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      translations = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse JSON response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    return translations;
  } catch (error) {
    console.error('Error translating batch:', error.message);
    throw error;
  }
}

// Find words with placeholders
function findPlaceholders(words) {
  return words.filter((word, index) => {
    const hasPlaceholder = word.translation.startsWith('[') || 
                          word.translation.includes('[NEED:') ||
                          word.translation.includes('[FR]') ||
                          word.translation.includes('[DE]') ||
                          word.translation.includes('[HU]');
    
    // Only A1-B1 words (first 3000)
    return hasPlaceholder && index < A1_B1_LIMIT;
  });
}

// Process language
async function processLanguage(langCode, apiKey, dryRun) {
  const langInfo = LANGUAGES[langCode];
  if (!langInfo) {
    console.error(`❌ Unknown language: ${langCode}`);
    return;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🌍 Processing ${langInfo.name} (${langCode})`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Load word file
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  const filePath = path.join(dataDir, langInfo.file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  const words = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`📖 Loaded ${words.length.toLocaleString()} words`);

  // Find placeholders in A1-B1
  const placeholders = findPlaceholders(words);
  console.log(`⚠️  Found ${placeholders.length} placeholders in A1-B1 (first 3000 words)`);

  if (placeholders.length === 0) {
    console.log('✅ No placeholders to fill!');
    return;
  }

  if (dryRun) {
    console.log('');
    console.log('🔍 DRY RUN - Sample words that need translation:');
    placeholders.slice(0, 10).forEach((w, i) => {
      console.log(`   ${i + 1}. "${w.word}" → ${w.translation}`);
    });
    console.log('');
    console.log(`💰 Estimated cost: ~$${(placeholders.length / 1000 * 0.03).toFixed(2)}`);
    console.log('   (Based on GPT-4 pricing: ~$0.03 per 1000 tokens)');
    console.log('');
    console.log('Run without --dry-run to actually translate');
    return;
  }

  console.log('');
  console.log(`🚀 Starting translation of ${placeholders.length} words...`);
  console.log(`   Language: ${langInfo.name} → English`);
  console.log(`   Batch size: ${BATCH_SIZE} words`);
  console.log('');

  let translated = 0;
  let failed = 0;
  const totalBatches = Math.ceil(placeholders.length / BATCH_SIZE);

  // Process in batches
  for (let i = 0; i < placeholders.length; i += BATCH_SIZE) {
    const batch = placeholders.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    
    console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} words)...`);

    try {
      const translations = await translateBatch(batch, langInfo.name, 'English', apiKey);
      
      // Update words with translations
      batch.forEach((placeholderWord, idx) => {
        if (translations[idx]) {
          const wordIndex = words.findIndex(w => w.word === placeholderWord.word);
          if (wordIndex !== -1) {
            const oldTranslation = words[wordIndex].translation;
            words[wordIndex].translation = translations[idx].translation;
            translated++;
            console.log(`   ✅ ${placeholderWord.word} → ${translations[idx].translation} (was: ${oldTranslation})`);
          }
        }
      });

      // Small delay to respect rate limits
      if (i + BATCH_SIZE < placeholders.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`   ❌ Batch ${batchNum} failed:`, error.message);
      failed += batch.length;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Translation Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Translated: ${translated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total processed: ${placeholders.length}`);
  console.log('');

  if (translated > 0) {
    // Save updated file
    const backupPath = filePath.replace('.json', '.backup.json');
    fs.writeFileSync(backupPath, fs.readFileSync(filePath));
    console.log(`💾 Backup saved: ${path.basename(backupPath)}`);

    fs.writeFileSync(filePath, JSON.stringify(words, null, 2));
    console.log(`💾 Updated file saved: ${langInfo.file}`);
    
    // Also update reverse file
    const reverseFilePath = path.join(dataDir, langInfo.reverseFile);
    if (fs.existsSync(reverseFilePath)) {
      const reverseWords = JSON.parse(fs.readFileSync(reverseFilePath, 'utf8'));
      // Update translations in reverse file too
      words.forEach(w => {
        const reverseWord = reverseWords.find(rw => rw.target_word === w.target_word);
        if (reverseWord) {
          reverseWord.word = w.translation;
        }
      });
      fs.writeFileSync(reverseFilePath, JSON.stringify(reverseWords, null, 2));
      console.log(`💾 Updated reverse file: ${langInfo.reverseFile}`);
    }

    console.log('');
    console.log('✅ Done! Please test the app with the new translations.');
  }
}

// Main function
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     Fill Translation Gaps - A1-B1 Words             ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  
  const options = parseArgs();
  const apiKey = checkAPIKey();

  console.log('');
  console.log('Configuration:');
  console.log(`  Language: ${options.lang}`);
  console.log(`  Target words: A1-B1 (first ${A1_B1_LIMIT})`);
  console.log(`  Batch size: ${BATCH_SIZE}`);
  console.log(`  Dry run: ${options.dryRun ? 'Yes' : 'No'}`);

  if (options.lang === 'all') {
    for (const langCode of Object.keys(LANGUAGES)) {
      await processLanguage(langCode, apiKey, options.dryRun);
    }
  } else {
    await processLanguage(options.lang, apiKey, options.dryRun);
  }

  console.log('');
  console.log('🎉 All done!');
  console.log('');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
