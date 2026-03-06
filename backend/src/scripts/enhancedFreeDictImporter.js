/**
 * Enhanced FreeDict importer with better CEFR level assignment
 * 
 * This version includes:
 * 1. Frequency-based level assignment using common word lists
 * 2. Language-specific vocabulary rules
 * 3. Integration with existing frequency data
 * 4. Batch processing with progress tracking
 * 
 * Usage:
 *   node src/scripts/enhancedFreeDictImporter.js --lang-pair=eng-fra --use-frequency=true
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { pool } = require('../config/database');

// Load frequency data from existing project files
async function loadFrequencyData(language) {
  const frequencyFiles = {
    'fr': 'french',
    'de': 'german', 
    'es': 'spanish',
    'hu': 'hungarian',
    'pt': 'portuguese',
    'ru': 'russian',
    'it': 'italian',     // Add when frequency data available
    'nl': 'dutch',       // Add when frequency data available  
    'pl': 'polish',      // Add when frequency data available
    'cs': 'czech',       // Add when frequency data available
    'da': 'danish',      // Add when frequency data available
    'sv': 'swedish',     // Add when frequency data available
    'no': 'norwegian',   // Add when frequency data available
    'fi': 'finnish'      // Add when frequency data available
  };
  
  const freqFile = frequencyFiles[language];
  if (!freqFile) return new Map();
  
  try {
    const dataPath = path.resolve(__dirname, `../../../data/${freqFile}`);
    const files = fs.readdirSync(dataPath);
    const frequencyMap = new Map();
    
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const content = fs.readFileSync(path.join(dataPath, file), 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          const word = line.trim().toLowerCase();
          if (word && !frequencyMap.has(word)) {
            // Lower index = higher frequency = lower level
            let level = 'C2';
            if (index < 1000) level = 'A1';
            else if (index < 2000) level = 'A2';
            else if (index < 4000) level = 'B1';
            else if (index < 8000) level = 'B2';
            else if (index < 15000) level = 'C1';
            
            frequencyMap.set(word, { level, rank: index + 1 });
          }
        });
      }
    }
    
    return frequencyMap;
  } catch (error) {
    console.warn(`Could not load frequency data for ${language}:`, error.message);
    return new Map();
  }
}

// Enhanced CEFR assignment using frequency data
function assignCEFRWithFrequency(word, translation, sourceLang, targetLang, frequencyData) {
  const wordLower = word.toLowerCase().trim();
  
  // Check source language frequency data first
  const sourceFreq = frequencyData.get(sourceLang);
  if (sourceFreq && sourceFreq.has(wordLower)) {
    return sourceFreq.get(wordLower).level;
  }
  
  // Check target language frequency data
  const targetFreq = frequencyData.get(targetLang);
  const translationWords = translation.toLowerCase().split(/\s+/);
  for (const tWord of translationWords) {
    if (targetFreq && targetFreq.has(tWord)) {
      return targetFreq.get(tWord).level;
    }
  }
  
  // Fallback to complexity-based assignment
  return assignCEFRByComplexity(word, translation);
}

function assignCEFRByComplexity(word, translation) {
  // Enhanced complexity scoring
  let score = 0;
  
  // Word characteristics
  const wordLen = word.length;
  const syllables = estimateSyllables(word);
  const hasPrefix = /^(un|re|pre|dis|mis|over|under|out|up)/.test(word.toLowerCase());
  const hasSuffix = /(-ly|-tion|-sion|-ment|-ness|-ful|-less|-able|-ible)$/.test(word.toLowerCase());
  
  // Length scoring
  if (wordLen <= 4) score += 0;
  else if (wordLen <= 6) score += 1;
  else if (wordLen <= 8) score += 2;
  else if (wordLen <= 10) score += 3;
  else score += 4;
  
  // Syllable scoring  
  if (syllables <= 1) score += 0;
  else if (syllables <= 2) score += 1;
  else if (syllables <= 3) score += 2;
  else score += 3;
  
  // Morphological complexity
  if (hasPrefix) score += 1;
  if (hasSuffix) score += 1;
  
  // Translation complexity
  const translationWords = translation.split(/\s+/).length;
  if (translationWords > 3) score += 2;
  else if (translationWords > 1) score += 1;
  
  // Technical terms
  if (isSpecializedTerm(word)) score += 3;
  
  // CEFR mapping
  if (score <= 2) return 'A1';
  if (score <= 4) return 'A2'; 
  if (score <= 6) return 'B1';
  if (score <= 8) return 'B2';
  if (score <= 10) return 'C1';
  return 'C2';
}

function estimateSyllables(word) {
  // More accurate syllable counting
  const vowelPattern = /[aeiouy]+/gi;
  const matches = word.match(vowelPattern);
  let syllables = matches ? matches.length : 1;
  
  // Adjust for silent 'e'
  if (word.toLowerCase().endsWith('e') && syllables > 1) {
    syllables--;
  }
  
  // Adjust for certain patterns
  if (word.toLowerCase().match(/le$/)) syllables++;
  
  return Math.max(syllables, 1);
}

function isSpecializedTerm(word) {
  const specializedPatterns = [
    /^bio|geo|astro|cyber|nano|micro/,
    /ology$|ography$|ometry$|ism$/,
    /ization$|ification$/,
    /^anti|ultra|multi|inter|trans/
  ];
  
  return specializedPatterns.some(pattern => pattern.test(word.toLowerCase()));
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
      cefr_level: assignCEFRWithFrequency(key, cleanDef, sourceLang, targetLang, new Map()),
      difficulty: 1,
      category: 'freedict',
      frequency_rank: null
    });
  });
  
  return words;
}

async function importWords(words) {
  const client = await pool.connect();
  const BATCH_SIZE = 500;
  
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

async function downloadFile(url, outputPath) {
  const https = require('https');
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
async function enhancedImport(langPair, options = {}) {
  console.log(`Starting enhanced import for ${langPair}...`);
  
  const [sourceLang, targetLang] = langPair.split('-').map(code => {
    const mapping = { 'eng': 'en', 'fra': 'fr', 'deu': 'de', 'spa': 'es', 'por': 'pt', 'rus': 'ru', 'hun': 'hu' };
    return mapping[code] || code;
  });
  
  // Load frequency data for both languages
  const frequencyData = new Map();
  console.log('Loading frequency data...');
  frequencyData.set(sourceLang, await loadFrequencyData(sourceLang));
  frequencyData.set(targetLang, await loadFrequencyData(targetLang));
  
  console.log(`Frequency data loaded: ${frequencyData.get(sourceLang).size} ${sourceLang} words, ${frequencyData.get(targetLang).size} ${targetLang} words`);
  
  // Download FreeDict file
  const tempPath = path.join(__dirname, `temp_${langPair}.xdxf`);
  const downloadUrl = `https://download.freedict.org/dictionaries/${langPair}/${langPair}.xdxf`;
  
  console.log(`Downloading ${langPair} dictionary...`);
  try {
    await downloadFile(downloadUrl, tempPath);
    console.log('Download complete.');
  } catch (error) {
    throw new Error(`Failed to download ${langPair}: ${error.message}`);
  }
  
  if (fs.existsSync(tempPath)) {
    console.log('Parsing dictionary...');
    const rawWords = await parseXDXF(tempPath, sourceLang, targetLang);
    
    // Enhance with frequency-based levels
    const enhancedWords = rawWords.map(word => ({
      ...word,
      cefr_level: assignCEFRWithFrequency(
        word.source_word,
        word.target_word,
        sourceLang,
        targetLang,
        frequencyData
      ),
      frequency_rank: getFrequencyRank(word.source_word, frequencyData.get(sourceLang))
    }));
    
    // Import with statistics
    const stats = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    enhancedWords.forEach(word => stats[word.cefr_level]++);
    
    console.log('CEFR Level Distribution:', stats);
    console.log('Total words to import:', enhancedWords.length);
    
    const result = await importWords(enhancedWords);
    console.log(`Import completed: ${result.imported} imported, ${result.skipped} skipped`);
    
    // Cleanup temporary file
    try {
      fs.unlinkSync(tempPath);
      console.log('Temporary file cleaned up.');
    } catch (error) {
      console.warn('Could not clean up temporary file:', error.message);
    }
    
    return result;
  } else {
    throw new Error(`Dictionary file not found: ${tempPath}`);
  }
}

function getFrequencyRank(word, frequencyMap) {
  const data = frequencyMap.get(word.toLowerCase());
  return data ? data.rank : null;
}

module.exports = { 
  enhancedImport, 
  assignCEFRWithFrequency, 
  loadFrequencyData 
};

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const langPairArg = args.find(arg => arg.startsWith('--lang-pair='));
  
  if (!langPairArg) {
    console.error('Usage: node enhancedFreeDictImporter.js --lang-pair=eng-fra');
    process.exit(1);
  }
  
  const langPair = langPairArg.split('=')[1];
  
  enhancedImport(langPair)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Enhanced import failed:', error);
      process.exit(1);
    });
}