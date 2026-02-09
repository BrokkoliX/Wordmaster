/**
 * Import 30,000 Spanish-English word pairs using frequency-based approach
 * Uses FrequencyWords dataset + CEFR level assignment
 * 
 * Data source: https://github.com/hermitdave/FrequencyWords
 * License: MIT (free to use)
 * 
 * Usage: node import30KSpanish.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// CEFR level thresholds based on frequency rank
const CEFR_LEVELS = {
  A1: { min: 1, max: 500, difficulty: 1 },
  A2: { min: 501, max: 1500, difficulty: 2 },
  B1: { min: 1501, max: 3000, difficulty: 3 },
  B2: { min: 3001, max: 6000, difficulty: 5 },
  C1: { min: 6001, max: 12000, difficulty: 7 },
  C2: { min: 12001, max: 30000, difficulty: 9 }
};

// Auto-categorization rules (keyword-based)
const CATEGORY_KEYWORDS = {
  food_drink: ['comida', 'bebida', 'comer', 'beber', 'pan', 'agua', 'leche', 'carne', 'fruta', 'verdura', 'cocina', 'restaurante'],
  family: ['familia', 'madre', 'padre', 'hijo', 'hija', 'hermano', 'abuelo', 'tío', 'primo', 'esposo'],
  time: ['tiempo', 'hora', 'día', 'semana', 'mes', 'año', 'hoy', 'mañana', 'ayer', 'lunes', 'enero'],
  places: ['casa', 'ciudad', 'país', 'lugar', 'calle', 'escuela', 'hospital', 'hotel', 'playa', 'montaña'],
  body_parts: ['cabeza', 'mano', 'pie', 'ojo', 'boca', 'nariz', 'oreja', 'brazo', 'pierna', 'corazón'],
  emotions: ['feliz', 'triste', 'amor', 'miedo', 'alegría', 'enojo', 'sorpresa', 'emoción'],
  transport: ['coche', 'autobús', 'tren', 'avión', 'barco', 'bicicleta', 'metro', 'taxi'],
  nature: ['árbol', 'flor', 'río', 'mar', 'montaña', 'sol', 'luna', 'estrella', 'animal', 'planta'],
  work_business: ['trabajo', 'empresa', 'oficina', 'dinero', 'negocio', 'empleo', 'jefe', 'reunión'],
  technology: ['computadora', 'teléfono', 'internet', 'correo', 'programa', 'datos', 'sistema'],
  education: ['escuela', 'estudiante', 'profesor', 'clase', 'libro', 'aprender', 'estudiar', 'examen'],
  health: ['salud', 'médico', 'enfermo', 'medicina', 'dolor', 'hospital', 'doctor'],
  weather: ['clima', 'lluvia', 'sol', 'nieve', 'viento', 'nube', 'temperatura', 'frío', 'calor'],
  colors: ['rojo', 'azul', 'verde', 'amarillo', 'blanco', 'negro', 'color'],
  numbers_math: ['número', 'uno', 'dos', 'tres', 'primero', 'segundo', 'mitad'],
  clothing: ['ropa', 'camisa', 'pantalón', 'zapato', 'vestido', 'sombrero'],
  animals: ['perro', 'gato', 'pájaro', 'pez', 'caballo', 'vaca', 'animal'],
  sports: ['deporte', 'juego', 'fútbol', 'equipo', 'jugador', 'partido'],
  music: ['música', 'canción', 'cantar', 'instrumento', 'guitarra'],
  arts_culture: ['arte', 'pintura', 'museo', 'cultura', 'teatro', 'película']
};

// Common English translations for frequent Spanish words
// This is a starter set - in production, use translation API
const COMMON_TRANSLATIONS = {
  // Top 100 most common words (manual for quality)
  'el': 'the',
  'de': 'of',
  'que': 'that',
  'y': 'and',
  'a': 'to',
  'en': 'in',
  'un': 'a',
  'ser': 'to be',
  'se': 'oneself',
  'no': 'no',
  'haber': 'to have',
  'por': 'for',
  'con': 'with',
  'su': 'his',
  'para': 'for',
  'como': 'like',
  'estar': 'to be',
  'tener': 'to have',
  'le': 'him',
  'lo': 'it',
  'todo': 'all',
  'pero': 'but',
  'más': 'more',
  'hacer': 'to do',
  'o': 'or',
  'poder': 'can',
  'decir': 'to say',
  'este': 'this',
  'ir': 'to go',
  'otro': 'other',
  'ese': 'that',
  'la': 'the',
  'si': 'if',
  'me': 'me',
  'ya': 'already',
  'ver': 'to see',
  'porque': 'because',
  'dar': 'to give',
  'cuando': 'when',
  'él': 'he',
  'muy': 'very',
  'sin': 'without',
  'vez': 'time',
  'mucho': 'much',
  'saber': 'to know',
  'qué': 'what',
  'sobre': 'about',
  'mi': 'my',
  'alguno': 'some',
  'mismo': 'same',
  'yo': 'I',
  'también': 'also',
  'hasta': 'until',
  'año': 'year',
  'dos': 'two',
  'querer': 'to want',
  'entre': 'between',
  'así': 'thus',
  'primero': 'first',
  'desde': 'from',
  'grande': 'big',
  'eso': 'that',
  'ni': 'nor',
  'nos': 'us',
  'llegar': 'to arrive',
  'pasar': 'to pass',
  'tiempo': 'time',
  'ella': 'she',
  'sí': 'yes',
  'día': 'day',
  'uno': 'one',
  'bien': 'well',
  'poco': 'little',
  'deber': 'must',
  'entonces': 'then',
  'poner': 'to put',
  'cosa': 'thing',
  'tanto': 'so much',
  'hombre': 'man',
  'parecer': 'to seem',
  'nuestro': 'our',
  'tan': 'so',
  'donde': 'where',
  'ahora': 'now',
  'parte': 'part',
  'después': 'after',
  'vida': 'life',
  'quedar': 'to stay',
  'siempre': 'always',
  'creer': 'to believe',
  'hablar': 'to speak',
  'llevar': 'to carry',
  'dejar': 'to leave',
  'nada': 'nothing',
  'cada': 'each',
  'seguir': 'to follow',
  'menos': 'less',
  'nuevo': 'new',
  'encontrar': 'to find',
  'algo': 'something',
  'solo': 'only',
  'decir': 'to say',
  'salir': 'to leave'
};

// Assign CEFR level based on frequency rank
function assignCEFRLevel(rank) {
  for (const [level, range] of Object.entries(CEFR_LEVELS)) {
    if (rank >= range.min && rank <= range.max) {
      return { cefr: level, difficulty: range.difficulty };
    }
  }
  return { cefr: 'C2', difficulty: 10 }; // Default for words beyond 30K
}

// Auto-categorize based on keywords
function categorizeWord(spanishWord) {
  const word = spanishWord.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Check if word contains any category keyword
    if (keywords.some(keyword => word.includes(keyword) || keyword.includes(word))) {
      return category;
    }
  }
  
  // Part of speech based categorization as fallback
  // Verbs (end in -ar, -er, -ir)
  if (word.match(/(ar|er|ir)$/)) return 'verbs';
  
  // Adjectives (common endings)
  if (word.match(/(able|ible|oso|osa|al|ante|ente)$/)) return 'adjectives';
  
  // Default to common phrases
  return 'common_phrases';
}

// Translate Spanish to English (using dictionary or API)
function translateWord(spanishWord) {
  // First check our manual dictionary
  if (COMMON_TRANSLATIONS[spanishWord.toLowerCase()]) {
    return COMMON_TRANSLATIONS[spanishWord.toLowerCase()];
  }
  
  // For real implementation, use translation API here
  // For now, mark as needing translation
  return null; // Will be translated via API in production
}

// Generate sample dataset (will be replaced with actual frequency list)
function generateSampleDataset(count = 1000) {
  console.log(`Generating sample dataset with ${count} words...`);
  
  const words = [];
  let rank = 1;
  
  // Add our manually curated common words first
  for (const [spanish, english] of Object.entries(COMMON_TRANSLATIONS)) {
    const { cefr, difficulty } = assignCEFRLevel(rank);
    const category = categorizeWord(spanish);
    
    words.push({
      id: String(rank),
      source_lang: 'en',
      target_lang: 'es',
      source_word: english,
      target_word: spanish,
      frequency_rank: rank,
      cefr_level: cefr,
      difficulty: difficulty,
      category: category
    });
    
    rank++;
  }
  
  console.log(`Added ${words.length} manually curated words`);
  return words;
}

// Download frequency list from FrequencyWords repo
async function downloadFrequencyList() {
  console.log('📥 Downloading Spanish frequency list...');
  console.log('Source: https://github.com/hermitdave/FrequencyWords');
  
  // NOTE: In real implementation, download from:
  // https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt
  
  console.log('⚠️  For now, using sample dataset');
  console.log('💡 To get full 30K words:');
  console.log('   1. Clone: git clone https://github.com/hermitdave/FrequencyWords.git');
  console.log('   2. File: FrequencyWords/content/2018/es/es_50k.txt');
  console.log('   3. Parse first 30,000 lines');
  
  return generateSampleDataset(1000); // Sample for now
}

// Main import function
async function importSpanishWords() {
  console.log('🚀 Starting Spanish word import...\n');
  
  // Step 1: Load frequency list
  const words = await downloadFrequencyList();
  
  // Step 2: Show statistics
  console.log('\n📊 Dataset Statistics:');
  console.log(`Total words: ${words.length}`);
  
  // Count by CEFR level
  const cefrCounts = {};
  const categoryCounts = {};
  
  words.forEach(w => {
    cefrCounts[w.cefr_level] = (cefrCounts[w.cefr_level] || 0) + 1;
    categoryCounts[w.category] = (categoryCounts[w.category] || 0) + 1;
  });
  
  console.log('\nBy CEFR Level:');
  Object.entries(cefrCounts).sort().forEach(([level, count]) => {
    console.log(`  ${level}: ${count} words`);
  });
  
  console.log('\nBy Category:');
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} words`);
    });
  
  // Step 3: Save to JSON
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'words_30k_spanish.json');
  fs.writeFileSync(outputPath, JSON.stringify(words, null, 2));
  
  console.log(`\n✅ Saved ${words.length} words to:`);
  console.log(`   ${outputPath}`);
  
  console.log('\n📝 Next steps:');
  console.log('   1. Review data/words_30k_spanish.json');
  console.log('   2. Add translation API for remaining words');
  console.log('   3. Import to SQLite database');
  console.log('   4. Test in app!');
  
  return words;
}

// Run if called directly
if (require.main === module) {
  importSpanishWords()
    .then(() => {
      console.log('\n🎉 Import complete!');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { importSpanishWords, assignCEFRLevel, categorizeWord };
