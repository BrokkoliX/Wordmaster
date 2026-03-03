/**
 * Translate frequency words using Free Dictionary API
 * This is a free alternative that doesn't require API keys
 * 
 * Usage: node translateWithFreeDictionary.js --lang=fr
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// CEFR level assignments
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
    frequencyFile: '../../FrequencyWords/content/2018/fr/fr_50k.txt'
  },
  de: { 
    name: 'German',
    flag: '🇩🇪',
    frequencyFile: '../../FrequencyWords/content/2018/de/de_50k.txt'
  },
  hu: { 
    name: 'Hungarian',
    flag: '🇭🇺',
    frequencyFile: '../../FrequencyWords/content/2018/hu/hu_50k.txt'
  }
};

// Common word translations (manually curated for most frequent words)
const COMMON_TRANSLATIONS = {
  fr: {
    'de': 'of/from',
    'je': 'I',
    'est': 'is',
    'pas': 'not',
    'le': 'the',
    'que': 'that',
    'la': 'the',
    'vous': 'you',
    'tu': 'you',
    'un': 'a/an',
    'il': 'he/it',
    'et': 'and',
    'à': 'to/at',
    'a': 'has',
    'ne': 'not',
    'les': 'the',
    'ce': 'this',
    'en': 'in',
    'on': 'one/we',
    'ça': 'that',
    'une': 'a/an',
    'ai': 'have',
    'pour': 'for',
    'des': 'some/of the',
    'moi': 'me',
    'qui': 'who/which',
    'nous': 'we/us',
    'comme': 'like/as',
    'mais': 'but',
    'son': 'his/her',
    'tout': 'all/everything',
    'va': 'goes',
    'bien': 'well/good',
    'être': 'to be',
    'plus': 'more',
    'au': 'to the',
    'lui': 'him/her',
    'fait': 'does/made',
    'si': 'if',
    'peut': 'can',
    'suis': 'am',
    'avec': 'with',
    'ses': 'his/her',
    'faire': 'to do/make',
    'dire': 'to say',
    'elle': 'she',
    'avoir': 'to have',
    'dans': 'in',
    'par': 'by',
    'où': 'where',
    'comment': 'how',
    'quand': 'when',
    'pourquoi': 'why',
    'bon': 'good',
    'très': 'very',
    'aussi': 'also',
    'ici': 'here',
    'là': 'there',
    'oui': 'yes',
    'non': 'no',
    'merci': 'thank you',
    'bonjour': 'hello',
    'bonsoir': 'good evening',
    'salut': 'hi',
    'au revoir': 'goodbye',
    'temps': 'time',
    'homme': 'man',
    'femme': 'woman',
    'enfant': 'child',
    'vie': 'life',
    'jour': 'day',
    'nuit': 'night',
    'fois': 'time',
    'chose': 'thing',
    'monde': 'world',
    'année': 'year',
    'heure': 'hour',
    'main': 'hand',
    'tête': 'head',
    'yeux': 'eyes',
    'maison': 'house',
    'ville': 'city',
    'pays': 'country',
    'eau': 'water',
    'feu': 'fire',
    'terre': 'earth/land',
    'ciel': 'sky',
    'père': 'father',
    'mère': 'mother',
    'fils': 'son',
    'fille': 'daughter/girl',
    'ami': 'friend',
    'grand': 'big/tall',
    'petit': 'small',
    'nouveau': 'new',
    'vieux': 'old',
    'jeune': 'young',
    'beau': 'beautiful',
    'noir': 'black',
    'blanc': 'white',
    'rouge': 'red',
    'bleu': 'blue',
    'vert': 'green',
    'jaune': 'yellow'
  },
  de: {
    'der': 'the',
    'die': 'the',
    'und': 'and',
    'in': 'in',
    'den': 'the',
    'von': 'of/from',
    'zu': 'to',
    'das': 'the/that',
    'mit': 'with',
    'sich': 'oneself',
    'des': 'of the',
    'auf': 'on',
    'für': 'for',
    'ist': 'is',
    'im': 'in the',
    'dem': 'the',
    'nicht': 'not',
    'ein': 'a/one',
    'eine': 'a/one',
    'als': 'as/than',
    'auch': 'also',
    'es': 'it',
    'an': 'at/on',
    'werden': 'to become',
    'aus': 'out/from',
    'er': 'he',
    'hat': 'has',
    'dass': 'that',
    'sie': 'she/they',
    'nach': 'after/to',
    'wird': 'becomes',
    'bei': 'at/by',
    'einer': 'a/one',
    'um': 'around/at',
    'am': 'at the',
    'sind': 'are',
    'noch': 'still/yet',
    'wie': 'how/like',
    'einem': 'a/one',
    'über': 'over/about',
    'einen': 'a/one',
    'so': 'so',
    'zum': 'to the',
    'war': 'was',
    'haben': 'to have',
    'nur': 'only',
    'oder': 'or',
    'aber': 'but',
    'vor': 'before',
    'zur': 'to the',
    'bis': 'until',
    'mehr': 'more',
    'durch': 'through',
    'man': 'one/man',
    'sein': 'to be/his',
    'wurde': 'became',
    'sei': 'be',
    'ja': 'yes',
    'nein': 'no',
    'gut': 'good',
    'neu': 'new',
    'alt': 'old',
    'groß': 'big',
    'klein': 'small',
    'lang': 'long',
    'kurz': 'short',
    'schwarz': 'black',
    'weiß': 'white',
    'rot': 'red',
    'blau': 'blue',
    'grün': 'green',
    'gelb': 'yellow',
    'Haus': 'house',
    'Mann': 'man',
    'Frau': 'woman',
    'Kind': 'child',
    'Tag': 'day',
    'Nacht': 'night',
    'Jahr': 'year',
    'Zeit': 'time',
    'Welt': 'world',
    'Leben': 'life',
    'Hand': 'hand',
    'Kopf': 'head',
    'Auge': 'eye',
    'Wasser': 'water',
    'Feuer': 'fire',
    'Erde': 'earth',
    'Himmel': 'sky',
    'Vater': 'father',
    'Mutter': 'mother',
    'Sohn': 'son',
    'Tochter': 'daughter',
    'Freund': 'friend'
  },
  hu: {
    'a': 'the',
    'az': 'the/that',
    'és': 'and',
    'van': 'is/there is',
    'hogy': 'that',
    'egy': 'a/one',
    'nem': 'not/no',
    'ki': 'who',
    'meg': 'particle',
    'ez': 'this',
    'is': 'also/too',
    'volt': 'was',
    'csak': 'only',
    'még': 'still/yet',
    'el': 'particle',
    'már': 'already',
    'be': 'in/into',
    'fel': 'up',
    'amit': 'which/that',
    'aki': 'who',
    'most': 'now',
    'vagy': 'or/you are',
    'mint': 'as/than',
    'lehet': 'can be',
    'akkor': 'then',
    'ha': 'if',
    'itt': 'here',
    'lesz': 'will be',
    'ami': 'which',
    'igen': 'yes',
    'de': 'but',
    'jó': 'good',
    'nagy': 'big',
    'új': 'new',
    'régi': 'old',
    'kis': 'small',
    'hosszú': 'long',
    'rövid': 'short',
    'fekete': 'black',
    'fehér': 'white',
    'piros': 'red',
    'kék': 'blue',
    'zöld': 'green',
    'sárga': 'yellow',
    'ház': 'house',
    'férfi': 'man',
    'nő': 'woman',
    'gyerek': 'child',
    'nap': 'day/sun',
    'éjszaka': 'night',
    'év': 'year',
    'idő': 'time',
    'világ': 'world',
    'élet': 'life',
    'kéz': 'hand',
    'fej': 'head',
    'szem': 'eye',
    'víz': 'water',
    'tűz': 'fire',
    'föld': 'earth',
    'ég': 'sky',
    'apa': 'father',
    'anya': 'mother',
    'fiú': 'son',
    'lány': 'girl/daughter',
    'barát': 'friend'
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

function readFrequencyFile(filePath, limit = 30000) {
  const absolutePath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
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

// Simple translation using common word dictionary
function translateWord(word, langCode) {
  const commonDict = COMMON_TRANSLATIONS[langCode];
  if (commonDict && commonDict[word.toLowerCase()]) {
    return commonDict[word.toLowerCase()];
  }
  
  // For words not in our dictionary, use a placeholder that indicates we need manual translation
  // In production, this would call a translation API
  return `[${langCode.toUpperCase()}:${word}]`;
}

async function translateLanguage(langCode) {
  const lang = LANGUAGES[langCode];
  if (!lang) {
    throw new Error(`Unknown language: ${langCode}. Available: fr, de, hu`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${lang.flag} Translating ${lang.name} to English`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Read frequency words
  const words = readFrequencyFile(lang.frequencyFile, 30000);
  
  const translatedWords = [];
  let translatedCount = 0;
  let placeholderCount = 0;
  
  console.log(`🔄 Translating ${words.length.toLocaleString()} words...\n`);
  
  words.forEach((word, idx) => {
    const rank = idx + 1;
    const { level, difficulty } = assignCEFR(rank);
    const translation = translateWord(word.word, langCode);
    
    if (!translation.startsWith('[')) {
      translatedCount++;
    } else {
      placeholderCount++;
    }
    
    translatedWords.push({
      id: `${langCode}_${rank}`,
      source_word: translation,
      target_word: word.word,
      difficulty,
      category: 'general',
      frequency_rank: rank,
      cefr_level: level,
      source_lang: 'en',
      target_lang: langCode
    });
    
    if ((idx + 1) % 5000 === 0) {
      console.log(`   Processed ${(idx + 1).toLocaleString()} words...`);
    }
  });
  
  console.log(`\n✅ Translation complete!`);
  console.log(`   ✓ Real translations: ${translatedCount.toLocaleString()}`);
  console.log(`   ⚠ Placeholders (need API): ${placeholderCount.toLocaleString()}\n`);
  
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
  console.log('\nSample translations (first 20):');
  translatedWords.slice(0, 20).forEach((w, i) => {
    const status = w.source_word.startsWith('[') ? '⚠' : '✓';
    console.log(`   ${status} ${i + 1}. ${w.target_word} = ${w.source_word} (${w.cefr_level})`);
  });
  
  // Save to JSON
  const outputDir = path.join(__dirname, '..', 'src', 'data');
  const outputFile = path.join(outputDir, `words_${lang.name.toLowerCase()}.json`);
  
  fs.writeFileSync(outputFile, JSON.stringify(translatedWords, null, 2), 'utf-8');
  
  const fileSizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
  console.log(`\n💾 Saved to: ${outputFile} (${fileSizeMB} MB)`);
  
  // Also create reverse pair
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
  console.log(`📊 Summary for ${lang.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total words: ${translatedWords.length.toLocaleString()}`);
  console.log(`Real translations: ${translatedCount.toLocaleString()} (${((translatedCount/translatedWords.length)*100).toFixed(1)}%)`);
  console.log(`Need API translation: ${placeholderCount.toLocaleString()} (${((placeholderCount/translatedWords.length)*100).toFixed(1)}%)`);
  console.log(`${'='.repeat(60)}\n`);
  
  return {
    total: translatedWords.length,
    translated: translatedCount,
    placeholders: placeholderCount
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
  console.log('\n🌍 Frequency Words Translation Tool (Free Dictionary)\n');
  
  const args = parseArgs();
  
  console.log('Configuration:');
  console.log(`  Language: ${args.lang}`);
  console.log(`  Method: Common word dictionary + placeholders`);
  console.log(`  Words limit: 30,000\n`);
  
  console.log('ℹ️  Note: This uses a manually curated dictionary for common words.');
  console.log('   Words not in the dictionary will need API translation later.\n');
  
  try {
    const stats = await translateLanguage(args.lang);
    
    console.log('\n🎉 Next steps:');
    console.log('   1. Review the generated JSON files');
    console.log(`   2. ${stats.placeholders > 0 ? `Use translateFrequencyWords.js with API for remaining ${stats.placeholders.toLocaleString()} words` : 'All words translated!'}`);
    console.log('   3. Uncomment language in src/screens/SettingsScreen.js');
    console.log('   4. Test in the app!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { translateLanguage, readFrequencyFile };
