/**
 * Import FreeDict.org dictionaries into Wordmaster
 * 
 * Usage:
 *   node src/scripts/importFreeDictData.js --lang-pair=eng-fra --format=xdxf
 * 
 * Downloads dictionaries from freedict.org and converts them to Wordmaster format.
 * Supports XDXF and TEI formats.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const xml2js = require('xml2js');
const { pool } = require('../config/database');

const FREEDICT_BASE_URL = 'https://download.freedict.org/dictionaries';
const BATCH_SIZE = 500;

// Language code mappings between FreeDict and Wordmaster
const LANG_CODE_MAP = {
  'eng': 'en',
  'fra': 'fr', 
  'deu': 'de',
  'spa': 'es',
  'por': 'pt',
  'rus': 'ru',
  'hun': 'hu',
  'ita': 'it',
  'nld': 'nl',
  'pol': 'pl',
  'ces': 'cs',
  'dan': 'da',
  'swe': 'sv',
  'nor': 'no',
  'fin': 'fi',
  'ron': 'ro',
  'bul': 'bg'
};

// CEFR level assignment using multiple criteria
function assignCEFRLevel(word, translation, context = {}) {
  const wordLower = word.toLowerCase().trim();
  
  // Check against common vocabulary lists first
  if (isCommonA1Word(wordLower)) return 'A1';
  if (isCommonA2Word(wordLower)) return 'A2';
  if (isCommonB1Word(wordLower)) return 'B1';
  
  // Use complexity scoring as fallback
  const complexityScore = calculateComplexityScore(word, translation);
  
  if (complexityScore <= 2) return 'A1';
  if (complexityScore <= 4) return 'A2';
  if (complexityScore <= 6) return 'B1';
  if (complexityScore <= 8) return 'B2';
  if (complexityScore <= 10) return 'C1';
  return 'C2';
}

// Common A1 vocabulary (expandable)
const A1_VOCABULARY = new Set([
  'hello', 'goodbye', 'yes', 'no', 'please', 'thank', 'sorry', 'excuse',
  'name', 'age', 'home', 'work', 'school', 'family', 'friend', 'food',
  'water', 'time', 'day', 'week', 'month', 'year', 'today', 'tomorrow',
  'good', 'bad', 'big', 'small', 'hot', 'cold', 'new', 'old', 'happy', 'sad',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'
]);

// Common A2 vocabulary (expandable)  
const A2_VOCABULARY = new Set([
  'beautiful', 'important', 'interesting', 'different', 'difficult', 'easy',
  'expensive', 'cheap', 'dangerous', 'safe', 'comfortable', 'tired',
  'shopping', 'travel', 'holiday', 'hotel', 'restaurant', 'weather',
  'money', 'price', 'ticket', 'station', 'airport', 'medicine', 'doctor'
]);

// Common B1 vocabulary (expandable)
const B1_VOCABULARY = new Set([
  'environment', 'government', 'education', 'technology', 'relationship',
  'experience', 'opportunity', 'development', 'management', 'communication',
  'advantage', 'disadvantage', 'solution', 'problem', 'situation'
]);

function isCommonA1Word(word) {
  return A1_VOCABULARY.has(word);
}

function isCommonA2Word(word) {
  return A2_VOCABULARY.has(word);
}

function isCommonB1Word(word) {
  return B1_VOCABULARY.has(word);
}

function calculateComplexityScore(word, translation) {
  let score = 0;
  
  // Word length factor
  if (word.length > 10) score += 2;
  else if (word.length > 7) score += 1;
  
  // Translation length factor
  if (translation.length > 20) score += 2;
  else if (translation.length > 15) score += 1;
  
  // Syllable estimation (rough)
  const syllables = estimateSyllables(word);
  if (syllables > 4) score += 3;
  else if (syllables > 3) score += 2;
  else if (syllables > 2) score += 1;
  
  // Special characters or numbers
  if (/[^\w\s-']/.test(word)) score += 2;
  
  // Multiple words in translation (phrase complexity)
  const wordCount = translation.split(/\s+/).length;
  if (wordCount > 3) score += 2;
  else if (wordCount > 2) score += 1;
  
  // Technical or specialized terms (basic detection)
  if (hasSpecializedSuffixes(word)) score += 3;
  
  return Math.min(score, 12); // Cap at 12
}

function estimateSyllables(word) {
  // Simple syllable estimation
  const vowels = word.toLowerCase().match(/[aeiouy]+/g);
  return vowels ? vowels.length : 1;
}

function hasSpecializedSuffixes(word) {
  const specialSuffixes = ['-tion', '-sion', '-ment', '-ness', '-ity', '-ism', '-ogy', '-graphy'];
  return specialSuffixes.some(suffix => word.toLowerCase().endsWith(suffix));
}

// Enhanced validation (reuses patterns from seedWords.js)
const DESCRIPTION_PATTERNS = [
  /\b(nominative|accusative|dative|genitive|ablative)\s+(singular|plural|of)\b/i,
  /^(first|second|third)[\s-]person\b/i,
  /\b(inflection|conjugation|declension)\s+of\b/i,
  /\bform\s+of\b/i,
  /\bcontraction\s+of\b/i,
  /\bletter\b.*\balphabet\b/i,
  /\b(masculine|feminine|neuter)\b/i,
];

function isBadEntry(text) {
  if (!text || text.length > 80) return true;
  
  for (const pattern of DESCRIPTION_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  
  if ((text.match(/\//g) || []).length > 2) return true;
  if (text.endsWith(')') && !text.includes('(')) return true;
  
  return false;
}

async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function parseXDXF(filePath, sourceLang, targetLang) {
  const xmlContent = fs.readFileSync(filePath, 'utf-8');
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xmlContent);
  
  const words = [];
  const articles = result.xdxf?.ar || [];
  
  articles.forEach((article, index) => {
    const key = article.k?.[0];
    const definition = article.def?.[0];
    
    if (!key || !definition || isBadEntry(key) || isBadEntry(definition)) {
      return;
    }
    
    // Clean up definition text
    let cleanDef = typeof definition === 'string' ? definition : definition._;
    if (!cleanDef) return;
    
    cleanDef = cleanDef.replace(/<[^>]*>/g, '').trim();
    if (isBadEntry(cleanDef)) return;
    
    words.push({
      id: `freedict_${sourceLang}_${targetLang}_${index}`,
      source_word: key.trim(),
      target_word: cleanDef,
      source_lang: sourceLang,
      target_lang: targetLang,
      cefr_level: assignCEFRLevel(key, cleanDef),
      difficulty: 1,
      category: 'freedict',
      frequency_rank: null
    });
  });
  
  return words;
}

async function parseTEI(filePath, sourceLang, targetLang) {
  // TEI parsing would be more complex - placeholder for now
  console.log('TEI parsing not yet implemented');
  return [];
}

async function importWords(words) {
  const client = await pool.connect();
  
  try {
    let imported = 0;
    let skipped = 0;
    
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE);
      
      const values = [];
      const params = [];
      let paramIndex = 1;
      
      for (const w of batch) {
        if (isBadEntry(w.source_word) || isBadEntry(w.target_word)) {
          skipped++;
          continue;
        }
        
        values.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
        );
        params.push(
          w.id,
          w.target_word,
          w.source_word,
          w.difficulty,
          w.category,
          w.frequency_rank,
          w.cefr_level,
          w.source_lang,
          w.target_lang
        );
        paramIndex += 9;
      }
      
      if (values.length > 0) {
        const query = `
          INSERT INTO words (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
          VALUES ${values.join(', ')}
          ON CONFLICT (id) DO NOTHING
        `;
        const result = await client.query(query, params);
        imported += result.rowCount;
      }
    }
    
    return { imported, skipped };
  } finally {
    client.release();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const langPairArg = args.find(arg => arg.startsWith('--lang-pair='));
  const formatArg = args.find(arg => arg.startsWith('--format=')) || '--format=xdxf';
  
  if (!langPairArg) {
    console.error('Usage: node importFreeDictData.js --lang-pair=eng-fra [--format=xdxf|tei]');
    console.error('Available language pairs: eng-fra, eng-deu, eng-spa, eng-por, etc.');
    process.exit(1);
  }
  
  const langPair = langPairArg.split('=')[1];
  const format = formatArg.split('=')[1];
  const [freeDictSource, freeDictTarget] = langPair.split('-');
  
  const sourceLang = LANG_CODE_MAP[freeDictSource];
  const targetLang = LANG_CODE_MAP[freeDictTarget];
  
  if (!sourceLang || !targetLang) {
    console.error(`Unsupported language codes: ${freeDictSource}-${freeDictTarget}`);
    process.exit(1);
  }
  
  console.log(`Importing ${langPair} dictionary in ${format.toUpperCase()} format...`);
  
  // Download dictionary file
  const fileName = `${langPair}.${format}`;
  const downloadUrl = `${FREEDICT_BASE_URL}/${langPair}/${fileName}`;
  const tempPath = path.join(__dirname, `temp_${fileName}`);
  
  try {
    console.log(`Downloading from ${downloadUrl}...`);
    await downloadFile(downloadUrl, tempPath);
    console.log('Download complete.');
    
    // Parse based on format
    let words;
    if (format === 'xdxf') {
      words = await parseXDXF(tempPath, sourceLang, targetLang);
    } else if (format === 'tei') {
      words = await parseTEI(tempPath, sourceLang, targetLang);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    console.log(`Parsed ${words.length} words.`);
    
    // Import to database
    const { imported, skipped } = await importWords(words);
    console.log(`Import complete: ${imported} imported, ${skipped} skipped.`);
    
    // Cleanup
    fs.unlinkSync(tempPath);
    
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { importWords, parseXDXF, assignCEFRLevel };