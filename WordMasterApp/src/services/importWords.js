/**
 * Import 30K words into the app database
 * Called on first app launch when database is empty
 */

import * as SQLite from 'expo-sqlite';
import wordsData from '../data/words_translated.json';

const DB_NAME = 'wordmaster.db';
const db = SQLite.openDatabaseSync(DB_NAME);

export const importAllWords = async () => {
  try {
    console.log('📥 Starting word import...');
    console.log(`   Total words to import: ${wordsData.length.toLocaleString()}`);
    
    let imported = 0;
    let skipped = 0;
    
    // Import in batches for better performance
    const batchSize = 100;
    
    for (let i = 0; i < wordsData.length; i += batchSize) {
      const batch = wordsData.slice(i, i + batchSize);
      
      await db.execAsync('BEGIN TRANSACTION');
      
      for (const word of batch) {
        // Skip if no English translation or placeholder
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
              word.target_word,      // Spanish → word column
              word.source_word,      // English → translation column
              word.difficulty,
              word.category,
              word.frequency_rank,
              word.cefr_level,
              'en',
              'es'
            ]
          );
          imported++;
        } catch (error) {
          console.error(`Error importing word ${word.id}:`, error.message);
          skipped++;
        }
      }
      
      await db.execAsync('COMMIT');
      
      // Log progress
      if ((i + batchSize) % 1000 === 0) {
        console.log(`   Imported ${imported.toLocaleString()} words...`);
      }
    }
    
    console.log(`✅ Import complete!`);
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
