/**
 * Translate missing words using a simple dictionary/API approach
 * Focus on A1 and A2 words (most common 1500)
 */

const fs = require('fs');
const path = require('path');

// Basic Spanish-English dictionary for most common words
const basicDictionary = {
  // Top 100 most common Spanish words
  'de': 'of',
  'que': 'that',
  'no': 'no',
  'la': 'the',
  'el': 'the',
  'es': 'is',
  'en': 'in',
  'lo': 'it',
  'un': 'a',
  'por': 'for',
  'qué': 'what',
  'me': 'me',
  'una': 'a',
  'los': 'the',
  'se': 'himself',
  'te': 'you',
  'con': 'with',
  'para': 'for',
  'mi': 'my',
  'está': 'is',
  'si': 'if',
  'pero': 'but',
  'su': 'his',
  'las': 'the',
  'yo': 'I',
  'del': 'of the',
  'tu': 'your',
  'como': 'how',
  'le': 'him',
  'ya': 'already',
  'al': 'to the',
  'más': 'more',
  'o': 'or',
  'eso': 'that',
  'este': 'this',
  'sí': 'yes',
  'mi': 'my',
  'ser': 'to be',
  'ha': 'has',
  'tú': 'you',
  'hay': 'there is',
  'muy': 'very',
  'son': 'are',
  'ni': 'nor',
  'tan': 'so',
  'puede': 'can',
  'todo': 'all',
  'también': 'also',
  'bien': 'well',
  'él': 'he',
  'ahora': 'now',
  'algo': 'something',
  'estoy': 'I am',
  'tengo': 'I have',
  'creo': 'I think',
  'mismo': 'same',
  'aquí': 'here',
  'quiero': 'I want',
  'sólo': 'only',
  'decir': 'to say',
  'uno': 'one',
  'saber': 'to know',
  'hacer': 'to do',
  'todos': 'all',
  'así': 'so',
  'puedo': 'I can',
  'cómo': 'how',
  'ella': 'she',
  'vez': 'time',
  'dos': 'two',
  'ti': 'you',
  'eres': 'you are',
  'cuando': 'when',
  'porque': 'because',
  'dónde': 'where',
  'nosotros': 'we',
  'tiempo': 'time',
  'cada': 'each',
  'día': 'day',
  'vida': 'life',
  'tres': 'three',
  'cosa': 'thing',
  'hombre': 'man',
  'mujer': 'woman',
  'año': 'year',
  'casa': 'house',
  'menos': 'less',
  'mundo': 'world',
  'después': 'after',
  'antes': 'before',
  'siempre': 'always',
  'hola': 'hello',
  'gracias': 'thank you',
  'adiós': 'goodbye',
  'por favor': 'please',
  'buenos días': 'good morning',
  'buenas tardes': 'good afternoon',
  'buenas noches': 'good night',
  'nombre': 'name',
  'agua': 'water',
  'comida': 'food',
  'amigo': 'friend',
  'madre': 'mother',
  'padre': 'father',
  'hijo': 'son',
  'hija': 'daughter',
  'hermano': 'brother',
  'hermana': 'sister'
};

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'words_30k_spanish.json');

function main() {
  console.log('🔧 Translating missing words with basic dictionary\n');
  
  const words = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📚 Loaded ${words.length.toLocaleString()} words`);
  
  let fixed = 0;
  let stillMissing = 0;
  
  for (const word of words) {
    if (word.source_word && word.source_word.startsWith('[TRANSLATE')) {
      const spanishWord = word.target_word;
      
      if (basicDictionary[spanishWord]) {
        word.source_word = basicDictionary[spanishWord];
        fixed++;
      } else {
        stillMissing++;
      }
    }
  }
  
  console.log(`✅ Fixed ${fixed.toLocaleString()} translations using dictionary`);
  console.log(`⚠️  Still missing: ${stillMissing.toLocaleString()} translations`);
  
  // Save
  fs.writeFileSync(jsonPath, JSON.stringify(words, null, 2));
  console.log(`\n💾 Updated: words_30k_spanish.json`);
  console.log('\n🎉 Done!');
  console.log('\n📝 Note: For remaining words, you can:');
  console.log('   1. Use a translation API');
  console.log('   2. Import from bilingual dictionary');
  console.log('   3. Add manually as needed');
}

main();
