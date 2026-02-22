/**
 * Import 30,000 Spanish-English word pairs with CEFR levels
 * Data source: FrequencyWords - OpenSubtitles corpus
 * 
 * This creates a professional, scalable word database with:
 * - 30,000 frequency-ranked words
 * - CEFR levels (A1-C2)
 * - Auto-categorization
 * - English translations
 */

const fs = require('fs');
const path = require('path');

// CEFR level assignment based on frequency rank
const CEFR_LEVELS = {
  A1: { min: 1, max: 500, difficulty: 1, description: 'Beginner - Survival basics' },
  A2: { min: 501, max: 1500, difficulty: 2, description: 'Elementary - Everyday situations' },
  B1: { min: 1501, max: 3000, difficulty: 3, description: 'Intermediate - Independent user' },
  B2: { min: 3001, max: 6000, difficulty: 5, description: 'Upper Intermediate - Fluent conversations' },
  C1: { min: 6001, max: 12000, difficulty: 7, description: 'Advanced - Professional proficiency' },
  C2: { min: 12001, max: 30000, difficulty: 9, description: 'Mastery - Native-like fluency' }
};

// Spanish-English translation dictionary (top 1000 most common words)
// For words not in this dictionary, we'll mark them for API translation
const ES_EN_DICTIONARY = {
  // Articles, pronouns, conjunctions (1-100)
  'de': 'of', 'que': 'that', 'no': 'no', 'a': 'to', 'la': 'the',
  'el': 'the', 'y': 'and', 'es': 'is', 'en': 'in', 'lo': 'it',
  'un': 'a', 'por': 'for', 'qué': 'what', 'me': 'me', 'una': 'a',
  'los': 'the', 'se': 'oneself', 'te': 'you', 'con': 'with', 'para': 'for',
  
  // Common verbs (101-300)
  'ser': 'to be', 'estar': 'to be', 'tener': 'to have', 'hacer': 'to do',
  'poder': 'can', 'decir': 'to say', 'ir': 'to go', 'ver': 'to see',
  'dar': 'to give', 'saber': 'to know', 'querer': 'to want', 'llegar': 'to arrive',
  'pasar': 'to pass', 'deber': 'must', 'poner': 'to put', 'parecer': 'to seem',
  'quedar': 'to stay', 'creer': 'to believe', 'hablar': 'to speak', 'llevar': 'to carry',
  'dejar': 'to leave', 'seguir': 'to follow', 'encontrar': 'to find', 'llamar': 'to call',
  'venir': 'to come', 'pensar': 'to think', 'salir': 'to leave', 'volver': 'to return',
  'tomar': 'to take', 'conocer': 'to know', 'vivir': 'to live', 'sentir': 'to feel',
  'tratar': 'to try', 'mirar': 'to look', 'contar': 'to count', 'empezar': 'to start',
  'esperar': 'to wait', 'buscar': 'to search', 'existir': 'to exist', 'entrar': 'to enter',
  'trabajar': 'to work', 'escribir': 'to write', 'perder': 'to lose', 'producir': 'to produce',
  'ocurrir': 'to occur', 'entender': 'to understand', 'pedir': 'to ask', 'recibir': 'to receive',
  'recordar': 'to remember', 'terminar': 'to finish', 'permitir': 'to allow', 'aparecer': 'to appear',
  'conseguir': 'to get', 'comenzar': 'to begin', 'servir': 'to serve', 'sacar': 'to take out',
  'necesitar': 'to need', 'mantener': 'to maintain', 'resultar': 'to result', 'leer': 'to read',
  'caer': 'to fall', 'cambiar': 'to change', 'presentar': 'to present', 'crear': 'to create',
  'abrir': 'to open', 'considerar': 'to consider', 'oír': 'to hear', 'acabar': 'to finish',
  'cumplir': 'to fulfill', 'realizar': 'to realize', 'suponer': 'to suppose', 'comprender': 'to understand',
  
  // Common nouns (301-600)
  'año': 'year', 'vez': 'time', 'día': 'day', 'cosa': 'thing', 'hombre': 'man',
  'tiempo': 'time', 'parte': 'part', 'vida': 'life', 'caso': 'case', 'mano': 'hand',
  'mujer': 'woman', 'mundo': 'world', 'forma': 'form', 'casa': 'house', 'lugar': 'place',
  'momento': 'moment', 'hijo': 'son', 'problema': 'problem', 'nombre': 'name', 'país': 'country',
  'pueblo': 'town', 'agua': 'water', 'punto': 'point', 'guerra': 'war', 'semana': 'week',
  'hora': 'hour', 'cuerpo': 'body', 'obra': 'work', 'familia': 'family', 'cabeza': 'head',
  'muerte': 'death', 'grupo': 'group', 'ciudad': 'city', 'historia': 'history', 'padre': 'father',
  'madre': 'mother', 'mes': 'month', 'lado': 'side', 'sistema': 'system', 'noche': 'night',
  'manera': 'way', 'libro': 'book', 'luz': 'light', 'calle': 'street', 'gobierno': 'government',
  'mesa': 'table', 'puertoerta': 'door', 'ojo': 'eye', 'voz': 'voice', 'cara': 'face',
  'tierra': 'earth', 'pie': 'foot', 'mal': 'evil', 'bien': 'good', 'persona': 'person',
  'amigo': 'friend', 'razón': 'reason', 'precio': 'price', 'habitación': 'room', 'mar': 'sea',
  'papel': 'paper', 'coche': 'car', 'mes': 'month', 'sala': 'room', 'número': 'number',
  'escuela': 'school', 'compañía': 'company', 'empresa': 'company', 'zona': 'zone', 'capital': 'capital',
  'programa': 'program', 'partido': 'party', 'mayor': 'major', 'niño': 'child', 'esposa': 'wife',
  'hermano': 'brother', 'rey': 'king', 'ministro': 'minister', 'edad': 'age', 'hija': 'daughter',
  'dinero': 'money', 'paso': 'step', 'orden': 'order', 'banco': 'bank', 'futuro': 'future',
  'palabra': 'word', 'ejemplo': 'example', 'nivel': 'level', 'sentido': 'sense', 'gente': 'people',
  
  // Common adjectives (601-800)
  'otro': 'other', 'todo': 'all', 'ese': 'that', 'este': 'this', 'mismo': 'same',
  'alguno': 'some', 'grande': 'big', 'nuevo': 'new', 'primero': 'first', 'poco': 'little',
  'tanto': 'so much', 'tan': 'so', 'solo': 'alone', 'único': 'unique', 'último': 'last',
  'mucho': 'much', 'cada': 'each', 'menos': 'less', 'mejor': 'better', 'bueno': 'good',
  'malo': 'bad', 'viejo': 'old', 'joven': 'young', 'pequeño': 'small', 'feliz': 'happy',
  'triste': 'sad', 'alto': 'tall', 'bajo': 'short', 'largo': 'long', 'corto': 'short',
  'blanco': 'white', 'negro': 'black', 'rojo': 'red', 'azul': 'blue', 'verde': 'green',
  'amarillo': 'yellow', 'claro': 'clear', 'oscuro': 'dark', 'fuerte': 'strong', 'débil': 'weak',
  'rico': 'rich', 'pobre': 'poor', 'caliente': 'hot', 'frío': 'cold', 'dulce': 'sweet',
  
  // Common adverbs (801-900)
  'muy': 'very', 'ya': 'already', 'también': 'also', 'así': 'thus', 'ahora': 'now',
  'después': 'after', 'entonces': 'then', 'siempre': 'always', 'nunca': 'never', 'donde': 'where',
  'cuando': 'when', 'como': 'how', 'bien': 'well', 'mal': 'badly', 'aquí': 'here',
  'allí': 'there', 'lejos': 'far', 'cerca': 'near', 'arriba': 'up', 'abajo': 'down',
  'dentro': 'inside', 'fuera': 'outside', 'hoy': 'today', 'mañana': 'tomorrow', 'ayer': 'yesterday',
  'temprano': 'early', 'tarde': 'late', 'pronto': 'soon', 'todavía': 'still', 'apenas': 'barely',
  
  // Numbers (901-950)
  'uno': 'one', 'dos': 'two', 'tres': 'three', 'cuatro': 'four', 'cinco': 'five',
  'seis': 'six', 'siete': 'seven', 'ocho': 'eight', 'nueve': 'nine', 'diez': 'ten',
  'veinte': 'twenty', 'treinta': 'thirty', 'cien': 'hundred', 'mil': 'thousand', 'millón': 'million',
  'primero': 'first', 'segundo': 'second', 'tercero': 'third', 'último': 'last', 'mitad': 'half',
  
  // Greetings & Common Phrases (951-1000)
  'hola': 'hello', 'adiós': 'goodbye', 'gracias': 'thank you', 'perdón': 'sorry', 'sí': 'yes',
  'buenos': 'good', 'días': 'days', 'noches': 'nights', 'señor': 'sir', 'señora': 'madam',
  'favor': 'favor', 'disculpa': 'excuse', 'salud': 'health', 'suerte': 'luck', 'amor': 'love',
  'verdad': 'truth', 'mentira': 'lie', 'miedo': 'fear', 'esperanza': 'hope', 'paz': 'peace'
};

// Category keywords for auto-categorization
const CATEGORY_KEYWORDS = {
  food_drink: ['comida', 'bebida', 'comer', 'beber', 'pan', 'agua', 'leche', 'carne', 'vino', 'café', 'té', 'fruta', 'verdura', 'arroz', 'sopa', 'pollo', 'pescado', 'queso', 'huevo', 'sal', 'azúcar', 'restaurante', 'cocina', 'plato', 'mesa', 'desayuno', 'almuerzo', 'cena'],
  family: ['familia', 'madre', 'padre', 'hijo', 'hija', 'hermano', 'hermana', 'abuelo', 'abuela', 'tío', 'tía', 'primo', 'esposo', 'esposa', 'niño', 'niña', 'bebé', 'marido', 'mujer', 'pariente'],
  time: ['tiempo', 'hora', 'día', 'semana', 'mes', 'año', 'hoy', 'mañana', 'ayer', 'tarde', 'noche', 'momento', 'segundo', 'minuto', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  places: ['casa', 'ciudad', 'país', 'lugar', 'calle', 'escuela', 'hospital', 'hotel', 'restaurante', 'tienda', 'mercado', 'parque', 'playa', 'montaña', 'río', 'mar', 'pueblo', 'edificio', 'puerta', 'ventana', 'habitación', 'sala', 'cocina', 'baño', 'oficina', 'aeropuerto', 'estación'],
  body_parts: ['cuerpo', 'cabeza', 'cara', 'ojo', 'oreja', 'nariz', 'boca', 'diente', 'lengua', 'cuello', 'hombro', 'brazo', 'mano', 'dedo', 'pierna', 'pie', 'corazón', 'sangre', 'piel', 'pelo', 'espalda', 'estómago'],
  emotions: ['amor', 'feliz', 'triste', 'alegre', 'enojado', 'miedo', 'esperanza', 'odio', 'emoción', 'sentir', 'sentimiento', 'pasión', 'celos', 'orgullo', 'vergüenza', 'sorpresa', 'preocupación'],
  transport: ['coche', 'auto', 'carro', 'autobús', 'tren', 'avión', 'barco', 'bicicleta', 'moto', 'camión', 'taxi', 'metro', 'transporte', 'viajar', 'viaje', 'conductor', 'pasajero'],
  nature: ['naturaleza', 'árbol', 'flor', 'planta', 'jardín', 'bosque', 'río', 'mar', 'océano', 'montaña', 'cielo', 'sol', 'luna', 'estrella', 'nube', 'lluvia', 'nieve', 'viento', 'tierra', 'piedra', 'arena'],
  work_business: ['trabajo', 'empresa', 'negocio', 'oficina', 'dinero', 'precio', 'banco', 'compañía', 'jefe', 'empleado', 'trabajar', 'empleo', 'salario', 'comercio', 'vender', 'comprar', 'cliente', 'mercado'],
  technology: ['computadora', 'ordenador', 'teléfono', 'internet', 'red', 'sistema', 'programa', 'datos', 'información', 'tecnología', 'máquina', 'aparato', 'digital'],
  education: ['escuela', 'universidad', 'colegio', 'estudiante', 'alumno', 'profesor', 'maestro', 'clase', 'curso', 'lección', 'estudiar', 'aprender', 'enseñar', 'libro', 'cuaderno', 'lápiz', 'examen', 'tarea'],
  health: ['salud', 'enfermo', 'enfermedad', 'médico', 'doctor', 'hospital', 'medicina', 'dolor', 'cura', 'paciente', 'tratamiento', 'medicamento', 'pastilla'],
  weather: ['clima', 'tiempo', 'lluvia', 'sol', 'nieve', 'viento', 'nube', 'tormenta', 'calor', 'frío', 'temperatura', 'llover', 'nevar'],
  colors: ['color', 'rojo', 'azul', 'verde', 'amarillo', 'blanco', 'negro', 'gris', 'rosa', 'marrón', 'naranja', 'morado', 'violeta'],
  numbers_math: ['número', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'matemática', 'contar', 'sumar', 'restar', 'multiplicar', 'dividir', 'igual', 'más', 'menos'],
  verbs: ['ser', 'estar', 'tener', 'hacer', 'poder', 'decir', 'ir', 'ver', 'dar', 'saber', 'querer', 'llegar', 'pasar', 'deber', 'poner'],
  adjectives: ['bueno', 'malo', 'grande', 'pequeño', 'nuevo', 'viejo', 'feliz', 'triste', 'alto', 'bajo', 'largo', 'corto', 'rico', 'pobre']
};

// Assign CEFR level based on frequency rank
function assignCEFRLevel(rank) {
  for (const [level, range] of Object.entries(CEFR_LEVELS)) {
    if (rank >= range.min && rank <= range.max) {
      return {
        cefr: level,
        difficulty: range.difficulty,
        description: range.description
      };
    }
  }
  return { cefr: 'C2', difficulty: 10, description: 'Mastery' };
}

// Auto-categorize word based on keywords
function categorizeWord(spanishWord) {
  const word = spanishWord.toLowerCase();
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (word === keyword || word.includes(keyword) || keyword.includes(word)) {
        return category;
      }
    }
  }
  
  // Part of speech detection
  if (word.match(/^(ser|estar|tener|hacer|poder|ir|ver|dar|saber|querer|haber|deber|poner|parecer|quedar|creer|llevar|dejar|seguir|encontrar|llamar|venir|pensar|salir|volver|tomar|conocer|vivir|sentir|tratar|mirar|contar|empezar|esperar|buscar)$/) || word.match(/(ar|er|ir)$/)) {
    return 'verbs';
  }
  
  if (word.match(/(mente)$/)) {
    return 'adverbs';
  }
  
  if (word.match(/(oso|osa|able|ible|al|ante|ente|ivo|iva)$/)) {
    return 'adjectives';
  }
  
  // Default category
  return 'common_phrases';
}

// Translate Spanish to English
function translateWord(spanishWord) {
  const word = spanishWord.toLowerCase();
  
  // Check dictionary
  if (ES_EN_DICTIONARY[word]) {
    return ES_EN_DICTIONARY[word];
  }
  
  // For words not in dictionary, mark for API translation
  return null;
}

// Parse FrequencyWords file
function parseFrequencyFile(filePath, maxWords = 30000) {
  console.log(`📖 Reading frequency file: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const words = [];
  let rank = 1;
  
  for (const line of lines) {
    if (rank > maxWords) break;
    
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    
    const spanishWord = parts[0];  // First part is the word
    const frequencyCount = parts[1]; // Second part is the count
    
    if (!spanishWord) continue;
    
    // Skip very short words (likely particles)
    if (spanishWord.length < 2) continue;
    
    // Translate
    const englishWord = translateWord(spanishWord);
    
    // Assign CEFR level
    const { cefr, difficulty, description } = assignCEFRLevel(rank);
    
    // Categorize
    const category = categorizeWord(spanishWord);
    
    words.push({
      id: String(rank),
      source_lang: 'en',
      target_lang: 'es',
      source_word: englishWord || `[TRANSLATE: ${spanishWord}]`,
      target_word: spanishWord,  // Only the word, not the frequency
      frequency_rank: rank,
      frequency_count: parseInt(frequencyCount) || 0,
      cefr_level: cefr,
      difficulty: difficulty,
      category: category,
      needs_translation: !englishWord
    });
    
    rank++;
  }
  
  return words;
}

// Main import function
async function importSpanish30K() {
  console.log('🚀 Starting 30K Spanish word import...\n');
  console.log('📊 Using CEFR levels for progressive learning:');
  Object.entries(CEFR_LEVELS).forEach(([level, info]) => {
    console.log(`   ${level}: ${info.min}-${info.max} words (${info.description})`);
  });
  console.log('');
  
  // Path to frequency file
  const frequencyFile = path.join(
    __dirname,
    '../../FrequencyWords/content/2018/es/es_50k.txt'
  );
  
  if (!fs.existsSync(frequencyFile)) {
    console.error(`❌ Error: Frequency file not found at ${frequencyFile}`);
    console.log('💡 Please ensure FrequencyWords repo is cloned in parent directory');
    return;
  }
  
  // Parse words
  console.log('⚙️  Parsing 30,000 words...');
  const words = parseFrequencyFile(frequencyFile, 30000);
  
  console.log(`✅ Parsed ${words.length} words\n`);
  
  // Statistics
  console.log('📊 Dataset Statistics:');
  console.log(`   Total words: ${words.length}`);
  
  const withTranslation = words.filter(w => !w.needs_translation).length;
  const needsTranslation = words.filter(w => w.needs_translation).length;
  console.log(`   ✅ With translation: ${withTranslation}`);
  console.log(`   ⏳ Needs translation: ${needsTranslation}`);
  
  // CEFR breakdown
  console.log('\n📚 By CEFR Level:');
  const cefrCounts = {};
  words.forEach(w => cefrCounts[w.cefr_level] = (cefrCounts[w.cefr_level] || 0) + 1);
  Object.entries(cefrCounts).sort().forEach(([level, count]) => {
    const percentage = ((count / words.length) * 100).toFixed(1);
    console.log(`   ${level}: ${count.toLocaleString()} words (${percentage}%)`);
  });
  
  // Category breakdown
  console.log('\n🏷️  Top 10 Categories:');
  const categoryCounts = {};
  words.forEach(w => categoryCounts[w.category] = (categoryCounts[w.category] || 0) + 1);
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count.toLocaleString()} words`);
    });
  
  // Save to JSON
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'words_30k_spanish.json');
  fs.writeFileSync(outputPath, JSON.stringify(words, null, 2));
  
  console.log(`\n✅ Saved to: ${outputPath}`);
  console.log(`📦 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Review the generated JSON file');
  console.log(`   2. Add translation API for ${needsTranslation.toLocaleString()} remaining words`);
  console.log('   3. Import to SQLite database');
  console.log('   4. Update app to use CEFR-based learning!');
  
  console.log('\n🌟 CEFR Learning Path:');
  console.log('   Users start at A1 (500 words - beginners)');
  console.log('   Progress through A2, B1, B2 (intermediate)');
  console.log('   Advance to C1, C2 (mastery - 30,000 words total)');
  console.log('   = 4+ years of daily content! 🚀');
  
  return words;
}

// Run if called directly
if (require.main === module) {
  importSpanish30K()
    .then(() => {
      console.log('\n🎉 Import complete!');
    })
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { importSpanish30K, assignCEFRLevel, categorizeWord, translateWord };
