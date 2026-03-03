/**
 * Generate 5000 English-Spanish word pairs
 * Tier 1: 500 essential (manual)
 * Tier 2: 1500 high-frequency (semi-automated)
 * Tier 3: 2000 intermediate (automated)
 * Tier 4: 1000 advanced (automated)
 */

const fs = require('fs');
const path = require('path');

// Comprehensive word dataset organized by category and difficulty
const wordDatabase = {
  // TIER 1: ESSENTIAL (500 words, difficulty 1-2)
  
  greetings: {
    diff: 1,
    words: [
      ['hello', 'hola'], ['goodbye', 'adiós'], ['good morning', 'buenos días'],
      ['good afternoon', 'buenas tardes'], ['good evening', 'buenas noches'],
      ['good night', 'buena noche'], ['see you later', 'hasta luego'],
      ['see you soon', 'hasta pronto'], ['welcome', 'bienvenido'],
      ['how are you', 'cómo estás'], ['nice to meet you', 'mucho gusto'],
      ['pleased to meet you', 'encantado'], ['what\'s up', 'qué tal'],
      ['how\'s it going', 'cómo te va'], ['long time no see', 'cuánto tiempo'],
      ['have a good day', 'que tengas un buen día'], ['take care', 'cuídate'],
      ['see you tomorrow', 'hasta mañana'], ['bye', 'chao'],
      ['hi', 'hola']
    ]
  },

  politeness: {
    diff: 1,
    words: [
      ['please', 'por favor'], ['thank you', 'gracias'], ['you\'re welcome', 'de nada'],
      ['excuse me', 'perdón'], ['sorry', 'lo siento'], ['pardon me', 'disculpe'],
      ['my apologies', 'mis disculpas'], ['may I', 'puedo'], ['could you', 'podrías'],
      ['would you mind', 'te importaría'], ['if you don\'t mind', 'si no te importa'],
      ['bless you', 'salud'], ['congratulations', 'felicidades'], ['good luck', 'buena suerte'],
      ['with pleasure', 'con mucho gusto'], ['don\'t worry', 'no te preocupes'],
      ['no problem', 'no hay problema'], ['of course', 'por supuesto'],
      ['certainly', 'ciertamente'], ['absolutely', 'absolutamente']
    ]
  },

  basic: {
    diff: 1,
    words: [
      ['yes', 'sí'], ['no', 'no'], ['maybe', 'quizás'], ['okay', 'vale'],
      ['fine', 'bien'], ['here', 'aquí'], ['there', 'allí'], ['where', 'dónde'],
      ['when', 'cuándo'], ['why', 'por qué'], ['how', 'cómo'], ['what', 'qué'],
      ['who', 'quién'], ['which', 'cuál'], ['because', 'porque'], ['but', 'pero'],
      ['and', 'y'], ['or', 'o'], ['with', 'con'], ['without', 'sin'],
      ['for', 'para'], ['from', 'de'], ['to', 'a'], ['in', 'en'],
      ['on', 'sobre'], ['at', 'en'], ['by', 'por'], ['more', 'más'],
      ['less', 'menos'], ['very', 'muy'], ['too', 'también'], ['also', 'también'],
      ['not', 'no'], ['never', 'nunca'], ['always', 'siempre'], ['sometimes', 'a veces'],
      ['now', 'ahora'], ['later', 'después'], ['before', 'antes'], ['after', 'después'],
      ['here', 'aquí'], ['there', 'allí'], ['everywhere', 'en todas partes'],
      ['somewhere', 'en algún lugar'], ['nowhere', 'en ningún lugar'], ['all', 'todo'],
      ['some', 'algunos'], ['many', 'muchos'], ['few', 'pocos'], ['none', 'ninguno']
    ]
  },

  numbers_math: {
    diff: 1,
    words: [
      ['zero', 'cero'], ['one', 'uno'], ['two', 'dos'], ['three', 'tres'],
      ['four', 'cuatro'], ['five', 'cinco'], ['six', 'seis'], ['seven', 'siete'],
      ['eight', 'ocho'], ['nine', 'nueve'], ['ten', 'diez'], ['eleven', 'once'],
      ['twelve', 'doce'], ['thirteen', 'trece'], ['fourteen', 'catorce'],
      ['fifteen', 'quince'], ['sixteen', 'dieciséis'], ['seventeen', 'diecisiete'],
      ['eighteen', 'dieciocho'], ['nineteen', 'diecinueve'], ['twenty', 'veinte'],
      ['thirty', 'treinta'], ['forty', 'cuarenta'], ['fifty', 'cincuenta'],
      ['sixty', 'sesenta'], ['seventy', 'setenta'], ['eighty', 'ochenta'],
      ['ninety', 'noventa'], ['hundred', 'cien'], ['thousand', 'mil'],
      ['million', 'millón'], ['first', 'primero'], ['second', 'segundo'],
      ['third', 'tercero'], ['last', 'último'], ['half', 'mitad'],
      ['quarter', 'cuarto'], ['plus', 'más'], ['minus', 'menos'],
      ['equals', 'igual'], ['number', 'número'], ['count', 'contar'],
      ['add', 'sumar'], ['subtract', 'restar'], ['multiply', 'multiplicar'],
      ['divide', 'dividir'], ['percent', 'por ciento'], ['double', 'doble'],
      ['triple', 'triple'], ['dozen', 'docena']
    ]
  },

  time: {
    diff: 1,
    words: [
      ['time', 'tiempo'], ['hour', 'hora'], ['minute', 'minuto'], ['second', 'segundo'],
      ['day', 'día'], ['week', 'semana'], ['month', 'mes'], ['year', 'año'],
      ['today', 'hoy'], ['tomorrow', 'mañana'], ['yesterday', 'ayer'],
      ['Monday', 'lunes'], ['Tuesday', 'martes'], ['Wednesday', 'miércoles'],
      ['Thursday', 'jueves'], ['Friday', 'viernes'], ['Saturday', 'sábado'],
      ['Sunday', 'domingo'], ['January', 'enero'], ['February', 'febrero'],
      ['March', 'marzo'], ['April', 'abril'], ['May', 'mayo'], ['June', 'junio'],
      ['July', 'julio'], ['August', 'agosto'], ['September', 'septiembre'],
      ['October', 'octubre'], ['November', 'noviembre'], ['December', 'diciembre'],
      ['spring', 'primavera'], ['summer', 'verano'], ['autumn', 'otoño'],
      ['winter', 'invierno'], ['morning', 'mañana'], ['afternoon', 'tarde'],
      ['evening', 'noche'], ['night', 'noche'], ['midnight', 'medianoche'],
      ['noon', 'mediodía'], ['early', 'temprano'], ['late', 'tarde'],
      ['often', 'a menudo'], ['rarely', 'rara vez'], ['daily', 'diario'],
      ['weekly', 'semanal'], ['monthly', 'mensual'], ['yearly', 'anual'],
      ['century', 'siglo'], ['decade', 'década']
    ]
  },

  colors: {
    diff: 1,
    words: [
      ['color', 'color'], ['red', 'rojo'], ['blue', 'azul'], ['green', 'verde'],
      ['yellow', 'amarillo'], ['orange', 'naranja'], ['purple', 'morado'],
      ['pink', 'rosa'], ['brown', 'marrón'], ['black', 'negro'],
      ['white', 'blanco'], ['gray', 'gris'], ['silver', 'plateado'],
      ['gold', 'dorado'], ['light', 'claro'], ['dark', 'oscuro'],
      ['bright', 'brillante'], ['pale', 'pálido'], ['beige', 'beige'],
      ['turquoise', 'turquesa'], ['violet', 'violeta'], ['maroon', 'granate']
    ]
  },

  family: {
    diff: 1,
    words: [
      ['family', 'familia'], ['mother', 'madre'], ['father', 'padre'],
      ['mom', 'mamá'], ['dad', 'papá'], ['parents', 'padres'],
      ['son', 'hijo'], ['daughter', 'hija'], ['brother', 'hermano'],
      ['sister', 'hermana'], ['grandfather', 'abuelo'], ['grandmother', 'abuela'],
      ['grandparents', 'abuelos'], ['uncle', 'tío'], ['aunt', 'tía'],
      ['cousin', 'primo'], ['nephew', 'sobrino'], ['niece', 'sobrina'],
      ['husband', 'esposo'], ['wife', 'esposa'], ['child', 'niño'],
      ['children', 'niños'], ['baby', 'bebé'], ['boy', 'niño'],
      ['girl', 'niña'], ['man', 'hombre'], ['woman', 'mujer'],
      ['person', 'persona'], ['people', 'gente'], ['friend', 'amigo'],
      ['boyfriend', 'novio'], ['girlfriend', 'novia'], ['partner', 'pareja'],
      ['spouse', 'cónyuge'], ['relative', 'pariente'], ['ancestor', 'antepasado'],
      ['descendant', 'descendiente'], ['twins', 'gemelos'], ['sibling', 'hermano'],
      ['stepfather', 'padrastro'], ['stepmother', 'madrastra']
    ]
  },

  // Continue with more categories...
  // This is a foundation - the script will expand this programmatically
};

// Function to generate comprehensive word list
function generateAllWords() {
  const allWords = [];
  let wordId = 1;
  let frequencyRank = 1;

  // Process manually defined words
  for (const [category, data] of Object.entries(wordDatabase)) {
    const baseDifficulty = data.diff || 1;
    
    data.words.forEach(([english, spanish]) => {
      allWords.push({
        id: String(wordId++),
        word: english,
        translation: spanish,
        difficulty: baseDifficulty,
        category: category,
        frequency_rank: frequencyRank++
      });
    });
  }

  console.log(`Generated ${allWords.length} words from manual database`);
  
  // TODO: Add automated generation for remaining words to reach 5000
  // This will be implemented in next phase
  
  return allWords;
}

// Generate and save
const words = generateAllWords();

const outputPath = path.join(__dirname, '..', 'src', 'data', 'words_expanded.json');
fs.writeFileSync(outputPath, JSON.stringify(words, null, 2));

console.log(`\n✅ Saved ${words.length} words to ${outputPath}`);
console.log('\nCategory breakdown:');

const stats = {};
words.forEach(w => stats[w.category] = (stats[w.category] || 0) + 1);
Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count} words`);
});

console.log(`\n📊 Total words: ${words.length}`);
console.log(`🎯 Target: 5000 words`);
console.log(`📈 Progress: ${((words.length / 5000) * 100).toFixed(1)}%`);
