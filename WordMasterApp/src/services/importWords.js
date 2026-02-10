/**
 * Import ALL languages into the app database
 * Called on first app launch when database is empty
 */

import * as SQLite from 'expo-sqlite';
import wordsEnToEs from '../data/words_translated.json';
import wordsEnToFr from '../data/words_french.json';
import wordsEnToDe from '../data/words_german.json';
import wordsEnToHu from '../data/words_hungarian.json';
import wordsEsToEn from '../data/words_spanish_to_english.json';
import wordsFrToEn from '../data/words_french_to_english.json';
import wordsDeToEn from '../data/words_german_to_english.json';
import wordsHuToEn from '../data/words_hungarian_to_english.json';

const DB_NAME = 'wordmaster.db';
const db = SQLite.openDatabaseSync(DB_NAME);

// All language datasets (bidirectional)
// NOTE: Only English-Spanish has real translations currently
// Other languages have placeholder translations and need translation API
const ALL_LANGUAGES = [
  { name: 'English → Spanish', data: wordsEnToEs, flag: '🇬🇧→🇪🇸' },
  { name: 'Spanish → English', data: wordsEsToEn, flag: '🇪🇸→🇬🇧' },
  // Disabled until translation API is integrated:
  // { name: 'English → French', data: wordsEnToFr, flag: '🇬🇧→🇫🇷' },
  // { name: 'English → German', data: wordsEnToDe, flag: '🇬🇧→🇩🇪' },
  // { name: 'English → Hungarian', data: wordsEnToHu, flag: '🇬🇧→🇭🇺' },
  // { name: 'French → English', data: wordsFrToEn, flag: '🇫🇷→🇬🇧' },
  // { name: 'German → English', data: wordsDeToEn, flag: '🇩🇪→🇬🇧' },
  // { name: 'Hungarian → English', data: wordsHuToEn, flag: '🇭🇺→🇬🇧' }
];

export const importAllWords = async () => {
  try {
    const totalWords = ALL_LANGUAGES.reduce((sum, lang) => sum + lang.data.length, 0);
    console.log('📥 Starting multi-language import...');
    console.log(`   Total words across all languages: ${totalWords.toLocaleString()}`);
    
    let imported = 0;
    let skipped = 0;
    
    // Import each language
    for (const language of ALL_LANGUAGES) {
      console.log(`${language.flag} Importing ${language.name}...`);
      const wordsData = language.data;
      
      // Import in batches for better performance
      const batchSize = 100;
      
      for (let i = 0; i < wordsData.length; i += batchSize) {
        const batch = wordsData.slice(i, i + batchSize);
        
        await db.execAsync('BEGIN TRANSACTION');
        
        for (const word of batch) {
          // Skip if no translation or placeholder
          if (!word.source_word || 
              word.source_word.trim() === '' ||
              word.source_word.startsWith('[TRANSLATE')) {
            skipped++;
            continue;
          }
          
          try {
            await db.runAsync(
              `INSERT INTO words (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                word.id,
                word.target_word,
                word.source_word,
                word.difficulty,
                word.category,
                word.frequency_rank,
                word.cefr_level,
                word.source_lang || 'en',
                word.target_lang || 'es'
            ]
          );
          imported++;
          } catch (error) {
            console.error(`Error importing word ${word.id}:`, error.message);
            skipped++;          }
        }
        
        await db.execAsync('COMMIT');
        
        // Log progress
        if ((i + batchSize) % 1000 === 0) {
          console.log(`   Imported ${imported.toLocaleString()} words...`);
        }
      }
      
      console.log(`   ✅ ${language.name} complete: ${wordsData.length.toLocaleString()} words`);
    }
    
    console.log(`\n✅ All languages imported!`);
    console.log(`   Imported: ${imported.toLocaleString()} words`);
    console.log(`   Skipped: ${skipped} words`);
    
    return { imported, skipped };
  } catch (error) {
    console.error('❌ Error importing words:', error);
    throw error;
  }
};

export default {
  importAllWords
};
