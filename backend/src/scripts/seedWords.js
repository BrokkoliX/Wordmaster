/**
 * Seed the words table in PostgreSQL from the JSON data files.
 *
 * Usage:
 *   node src/scripts/seedWords.js
 *
 * This reads every language-pair JSON file from the mobile app's data
 * directory and inserts all words into the backend database. It is
 * idempotent -- duplicate IDs are skipped via ON CONFLICT DO NOTHING.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const DATA_DIR = path.resolve(__dirname, '../../../WordMasterApp/src/data');

const LANGUAGE_FILES = [
  'words_translated.json',
  'words_french.json',
  'words_german.json',
  'words_hungarian.json',
  'words_spanish_to_english.json',
  'words_french_to_english.json',
  'words_german_to_english.json',
  'words_hungarian_to_english.json',
];

const BATCH_SIZE = 500;

async function seedWords() {
  const client = await pool.connect();

  try {
    // Create the words table if it does not exist yet
    await client.query(`
      CREATE TABLE IF NOT EXISTS words (
        id VARCHAR(100) PRIMARY KEY,
        word TEXT NOT NULL,
        translation TEXT NOT NULL,
        difficulty INTEGER DEFAULT 1,
        category VARCHAR(100),
        frequency_rank INTEGER,
        cefr_level VARCHAR(10) NOT NULL,
        source_lang VARCHAR(10) NOT NULL,
        target_lang VARCHAR(10) NOT NULL
      );
    `);

    let totalImported = 0;
    let totalSkipped = 0;

    for (const fileName of LANGUAGE_FILES) {
      const filePath = path.join(DATA_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${fileName} (file not found)`);
        continue;
      }

      console.log(`📥 Loading ${fileName}...`);
      const words = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`   ${words.length.toLocaleString()} words found`);

      let fileImported = 0;
      let fileSkipped = 0;

      for (let i = 0; i < words.length; i += BATCH_SIZE) {
        const batch = words.slice(i, i + BATCH_SIZE);

        // Build a multi-row INSERT with parameterised values
        const values = [];
        const params = [];
        let paramIndex = 1;

        for (const w of batch) {
          if (!w.source_word || w.source_word.trim() === '' || w.source_word.startsWith('[TRANSLATE')) {
            fileSkipped++;
            continue;
          }

          values.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
          );
          params.push(
            w.id,
            w.target_word,
            w.source_word,
            w.difficulty || 1,
            w.category || null,
            w.frequency_rank || null,
            w.cefr_level || 'A1',
            w.source_lang || 'en',
            w.target_lang || 'es'
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
          fileImported += result.rowCount;
        }

        // Progress log every 2000 words
        if ((i + BATCH_SIZE) % 2000 === 0) {
          console.log(`   ${Math.min(i + BATCH_SIZE, words.length).toLocaleString()} / ${words.length.toLocaleString()}...`);
        }
      }

      console.log(`   ✅ Imported ${fileImported.toLocaleString()}, skipped ${fileSkipped}`);
      totalImported += fileImported;
      totalSkipped += fileSkipped;
    }

    // Final count
    const countResult = await client.query('SELECT COUNT(*) as count FROM words');
    console.log(`\n✅ Seed complete.`);
    console.log(`   Imported: ${totalImported.toLocaleString()}`);
    console.log(`   Skipped:  ${totalSkipped}`);
    console.log(`   Total words in database: ${parseInt(countResult.rows[0].count).toLocaleString()}`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedWords();
