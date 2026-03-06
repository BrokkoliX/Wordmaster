/**
 * Enhance vocabulary by mining your existing large dictionary files
 * 
 * You already have:
 * - french.jsonl: 398k entries
 * - german.jsonl: 363k entries  
 * - hungarian.jsonl: 78k entries
 * - portuguese.jsonl: 426k entries
 * - russian.jsonl: 440k entries
 * - spanish.jsonl: 797k entries
 * 
 * But only using ~75k-330k in your mobile app.
 * Let's mine the unused entries for high-quality vocabulary.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { pool } = require('../config/database');

const DICTIONARIES_DIR = path.resolve(__dirname, '../../../dictionaries');
const BATCH_SIZE = 1000;

// Language mapping
const LANGUAGE_MAP = {
  'french': 'fr',
  'german': 'de', 
  'hungarian': 'hu',
  'portuguese': 'pt',
  'russian': 'ru',
  'spanish': 'es'
};

// Comprehensive patterns to exclude grammatical entries
const GRAMMATICAL_PATTERNS = [
  // Forms and inflections
  /\b(inflection|conjugation|declension|form)\s+of\b/i,
  /\b(singular|plural)\s+of\b/i,
  /\b(past|present|future)\s+(tense|participle)\s+of\b/i,
  /\b(comparative|superlative)\s+of\b/i,
  /\b(feminine|masculine|neuter)\s+(form\s+)?of\b/i,
  
  // Grammatical cases
  /\b(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative)\b/i,
  /\b(inessive|illative|elative|superessive|sublative|delative|adessive|allative)\b/i,
  /\b(translative|terminative|essive|causal|sociative|partitive|comitative)\b/i,
  
  // Person and number
  /\b(first|second|third)[\s-]person\b/i,
  /\b(first|second|third)\s+(person\s+)?(singular|plural)\b/i,
  
  // Verb forms
  /\b(infinitive|gerund|supine|imperative|subjunctive|indicative|conditional)\b/i,
  /\b(active|passive|reflexive|transitive|intransitive)\s+(voice|form)\b/i,
  
  // Letter references
  /\bletter\b.*\b(alphabet|ABC)\b/i,
  /\b(first|second|third|last)\s+letter\s+of\b/i,
  /\b\d+(st|nd|rd|th)\s+letter\b/i,
  
  // Alternative forms
  /\b(alternative|variant|archaic|obsolete|dialectal)\s+(form|spelling)\b/i,
  /\b(contraction|abbreviation|acronym|initialism)\s+of\b/i,
  /\b(diminutive|augmentative|pejorative)\s+of\b/i,
  
  // Linguistic descriptions
  /\b(used\s+to|refers\s+to|indicates|denotes|expresses)\b/i,
  /\b(interrogative|demonstrative|indefinite|definite)\s+(pronoun|article|adjective)\b/i,
  /\b(ordinal|cardinal)\s+number\b/i,
  
  // Multi-word descriptions that aren't translations
  /^(the|a|an)\s+(act|process|state|condition)\s+of\b/i,
  /^(one\s+who|someone\s+who|that\s+which)\b/i,
  
  // Language/writing system references
  /\b(written\s+in|spelled\s+in|transliteration\s+of)\b/i,
  /\b(ISO|Unicode|ASCII)\s+(code|standard)\b/i,
  
  // Phonetic descriptions
  /\b(pronounced|phonetic|IPA)\b/i,
  
  // Very long explanatory text (likely grammatical)
  /^.{100,}$/,  // Anything over 100 characters is likely an explanation
  
  // Starts with grammatical terms
  /^(inflected|conjugated|declined|derived|formed)\s+/i,
  /^(when|where|how|why|what|which)\s+/i,
];

// Enhanced filtering for quality entries
function isQualityEntry(entry) {
  if (!entry.word || !entry.senses || !Array.isArray(entry.senses)) {
    return false;
  }
  
  const word = entry.word.trim().toLowerCase();
  
  // Basic quality checks
  if (word.length < 2 || word.length > 25) return false;
  if (/^[0-9]+$/.test(word)) return false;  // No pure numbers
  if (word.includes('_') || word.includes('{') || word.includes('[')) return false;  // No technical terms
  if (word.includes(' ') && word.split(' ').length > 3) return false;  // No long phrases
  
  // Exclude words that are clearly grammatical
  if (isGrammaticalWord(word)) return false;
  
  // Must have at least one good sense
  const goodSenses = entry.senses.filter(sense => {
    if (!sense.glosses || !Array.isArray(sense.glosses)) return false;
    
    const glosses = sense.glosses.filter(gloss => {
      if (typeof gloss !== 'string') return false;
      return isCleanTranslation(gloss.trim());
    });
    
    return glosses.length > 0;
  });
  
  return goodSenses.length > 0;
}

function isGrammaticalWord(word) {
  // Words that are typically grammatical forms
  const grammaticalWords = [
    'the', 'and', 'or', 'but', 'if', 'when', 'where', 'how', 'why', 'what', 'which',
    'this', 'that', 'these', 'those', 'his', 'her', 'its', 'their', 'our', 'your',
    'he', 'she', 'it', 'they', 'we', 'you', 'i', 'me', 'him', 'them', 'us',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'a', 'an', 'some', 'any', 'all', 'each', 'every', 'no', 'none'
  ];
  
  return grammaticalWords.includes(word);
}

function isCleanTranslation(text) {
  if (text.length < 2 || text.length > 80) return false;
  
  // Check against all grammatical patterns
  for (const pattern of GRAMMATICAL_PATTERNS) {
    if (pattern.test(text)) {
      return false;
    }
  }
  
  // Additional specific checks
  if (text.includes('inflection of') || text.includes('form of')) return false;
  if (text.includes('singular of') || text.includes('plural of')) return false;
  if (text.includes('past participle') || text.includes('present participle')) return false;
  if (text.includes('first person') || text.includes('second person') || text.includes('third person')) return false;
  if (text.includes('letter of') || text.includes('alphabet')) return false;
  
  // Exclude phrases that start with grammatical indicators
  if (/^(the\s+)?(act|process|state|condition|ability|quality)\s+of\b/i.test(text)) return false;
  if (/^(someone|something|one)\s+who\b/i.test(text)) return false;
  if (/^(used\s+to|refers\s+to|indicates|means|denotes)\b/i.test(text)) return false;
  
  // Must be a reasonably simple translation (not a long explanation)
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 6) return false;  // Max 6 words for translations
  
  // No parenthetical explanations in the middle
  if (text.match(/\([^)]*\)/g) && text.match(/\([^)]*\)/g).length > 1) return false;
  
  return true;
}

function extractBestTranslation(entry) {
  const translations = [];
  
  entry.senses.forEach(sense => {
    if (sense.glosses && Array.isArray(sense.glosses)) {
      sense.glosses.forEach(gloss => {
        if (typeof gloss === 'string') {
          let clean = gloss.trim();
          
          // Skip if it doesn't pass our clean translation check
          if (!isCleanTranslation(clean)) {
            return;
          }
          
          // Clean up common patterns while preserving meaning
          clean = clean.replace(/^\([^)]*\)\s*/, ''); // Remove leading parentheses
          clean = clean.replace(/\s*\([^)]*\)$/, ''); // Remove trailing parentheses
          clean = clean.replace(/^\w+:\s*/, ''); // Remove category prefixes like "noun:"
          clean = clean.replace(/^to\s+/, ''); // Remove "to" prefix from verbs
          clean = clean.replace(/\s*;\s*.*$/, ''); // Remove everything after semicolon
          clean = clean.replace(/\s*,\s*.*$/, ''); // Remove everything after first comma
          clean = clean.replace(/\s+/g, ' '); // Normalize whitespace
          clean = clean.trim();
          
          // Final quality check after cleaning
          if (clean.length >= 2 && clean.length <= 30 && isSimpleWord(clean)) {
            translations.push(clean);
          }
        }
      });
    }
  });
  
  // Return the shortest, most concise translation
  const sortedTranslations = translations.sort((a, b) => a.length - b.length);
  return sortedTranslations[0] || null;
}

function isSimpleWord(text) {
  // Must be a simple word or short phrase
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 3) return false;
  
  // No weird characters or patterns
  if (/[{}[\]<>|\\\/]/.test(text)) return false;
  if (text.includes('...') || text.includes('etc')) return false;
  
  // Not all uppercase (likely an abbreviation or code)
  if (text === text.toUpperCase() && text.length > 2) return false;
  
  // No numbers mixed with letters in weird ways
  if (/\d+[a-zA-Z]+\d+/.test(text)) return false;
  
  // Must start with a letter
  if (!/^[a-zA-Z]/.test(text)) return false;
  
  return true;
}

function assignCEFRLevel(word, translation, pos) {
  let score = 0;
  
  // Word length factor
  if (word.length <= 4) score += 0;
  else if (word.length <= 6) score += 1;
  else if (word.length <= 8) score += 2;
  else score += 3;
  
  // Translation complexity
  if (translation.length <= 10) score += 0;
  else if (translation.length <= 20) score += 1;
  else score += 2;
  
  // Part of speech considerations
  if (pos === 'noun' || pos === 'verb' || pos === 'adj') score += 0; // Common types
  else if (pos === 'adv') score += 1;
  else score += 2; // Less common POS
  
  // Syllable complexity
  const syllables = word.match(/[aeiou]/gi)?.length || 1;
  if (syllables > 3) score += 1;
  if (syllables > 5) score += 2;
  
  // CEFR assignment
  if (score <= 1) return 'A1';
  if (score <= 3) return 'A2'; 
  if (score <= 5) return 'B1';
  if (score <= 7) return 'B2';
  if (score <= 9) return 'C1';
  return 'C2';
}

async function processLanguageFile(language) {
  const langCode = LANGUAGE_MAP[language];
  if (!langCode) {
    console.error(`Unknown language: ${language}`);
    return;
  }
  
  const filePath = path.join(DICTIONARIES_DIR, `${language}.jsonl`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  console.log(`\n🔄 Processing ${language} (${langCode})...`);
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let totalLines = 0;
  let qualityEntries = 0;
  let importedWords = 0;
  let skippedWords = 0;
  let batch = [];
  
  const client = await pool.connect();
  
  try {
    for await (const line of rl) {
      totalLines++;
      
      if (totalLines % 10000 === 0) {
        process.stdout.write(`\r  Processed ${totalLines.toLocaleString()} entries, found ${qualityEntries} quality entries...`);
      }
      
      try {
        const entry = JSON.parse(line);
        
        if (isQualityEntry(entry)) {
          qualityEntries++;
          
          const word = entry.word.trim().toLowerCase();
          const translation = extractBestTranslation(entry);
          const pos = entry.pos || 'unknown';
          
          if (translation) {
            batch.push({
              id: `dict_${langCode}_${qualityEntries}`,
              word: translation,  // English is the target
              translation: word,  // Source language is in translation field
              difficulty: 1,
              category: 'dictionary_mined',
              frequency_rank: null,
              cefr_level: assignCEFRLevel(word, translation, pos),
              source_lang: 'en',  // English to other language
              target_lang: langCode
            });
            
            // Also add reverse direction
            batch.push({
              id: `dict_${langCode}_${qualityEntries}_rev`,
              word: word,
              translation: translation,
              difficulty: 1,
              category: 'dictionary_mined',
              frequency_rank: null,
              cefr_level: assignCEFRLevel(word, translation, pos),
              source_lang: langCode,
              target_lang: 'en'
            });
          }
        }
        
        // Process batch
        if (batch.length >= BATCH_SIZE) {
          const result = await importBatch(client, batch);
          importedWords += result.imported;
          skippedWords += result.skipped;
          batch = [];
        }
        
      } catch (error) {
        // Skip malformed JSON lines
        continue;
      }
    }
    
    // Process remaining batch
    if (batch.length > 0) {
      const result = await importBatch(client, batch);
      importedWords += result.imported;
      skippedWords += result.skipped;
    }
    
    console.log(`\n✅ ${language} complete:`);
    console.log(`   📊 Total entries processed: ${totalLines.toLocaleString()}`);
    console.log(`   ✨ Quality entries found: ${qualityEntries.toLocaleString()}`);
    console.log(`   📥 Words imported: ${importedWords.toLocaleString()}`);
    console.log(`   ⏭️  Duplicates skipped: ${skippedWords.toLocaleString()}`);
    
    const quality = ((qualityEntries / totalLines) * 100).toFixed(2);
    console.log(`   📈 Quality rate: ${quality}%`);
    
  } finally {
    client.release();
  }
}

async function importBatch(client, batch) {
  let imported = 0;
  let skipped = 0;
  
  const values = [];
  const params = [];
  let paramIndex = 1;
  
  for (const word of batch) {
    values.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
    );
    params.push(
      word.id,
      word.word,
      word.translation,
      word.difficulty,
      word.category,
      word.frequency_rank,
      word.cefr_level,
      word.source_lang,
      word.target_lang
    );
    paramIndex += 9;
  }
  
  if (values.length > 0) {
    const query = `
      INSERT INTO words (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
      VALUES ${values.join(', ')}
      ON CONFLICT (id) DO NOTHING
    `;
    
    try {
      const result = await client.query(query, params);
      imported = result.rowCount;
      skipped = batch.length - imported;
    } catch (error) {
      console.error('Import batch error:', error.message);
      skipped = batch.length;
    }
  }
  
  return { imported, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  
  let targetLanguages;
  
  if (args.includes('--all')) {
    targetLanguages = Object.keys(LANGUAGE_MAP);
  } else if (args.includes('--small')) {
    targetLanguages = ['hungarian'];  // Start with the smallest
  } else {
    const langArg = args.find(arg => arg.startsWith('--language='));
    if (langArg) {
      const lang = langArg.split('=')[1];
      if (LANGUAGE_MAP[lang]) {
        targetLanguages = [lang];
      } else {
        console.error(`Unknown language: ${lang}`);
        console.log('Available languages:', Object.keys(LANGUAGE_MAP).join(', '));
        process.exit(1);
      }
    } else {
      console.log('🏗️  Wordmaster Dictionary Mining');
      console.log('================================');
      console.log('');
      console.log('Mine high-quality entries from your existing dictionary files:');
      console.log('');
      console.log('Options:');
      console.log('  --small             Mine Hungarian only (biggest impact)');
      console.log('  --language=french   Mine specific language');
      console.log('  --all              Mine all languages');
      console.log('');
      console.log('Available dictionaries:');
      console.log('  📚 French: 398k entries');
      console.log('  📚 German: 363k entries');
      console.log('  📚 Hungarian: 78k entries (recommended start)');
      console.log('  📚 Portuguese: 426k entries');
      console.log('  📚 Russian: 440k entries');
      console.log('  📚 Spanish: 797k entries');
      
      return;
    }
  }
  
  try {
    console.log('🚀 Starting dictionary mining...');
    
    for (const language of targetLanguages) {
      await processLanguageFile(language);
    }
    
    console.log('\n🎉 Dictionary mining complete!');
    
  } catch (error) {
    console.error('\n💥 Mining failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { processLanguageFile, isQualityEntry, extractBestTranslation };