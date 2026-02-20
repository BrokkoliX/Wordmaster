/**
 * Seed the sentence_templates table in PostgreSQL from bundled JSON files.
 *
 * Usage:
 *   node src/scripts/seedSentences.js
 *
 * Idempotent -- duplicates are skipped via ON CONFLICT DO NOTHING.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const DATA_DIR = path.resolve(__dirname, '../../../WordMasterApp/src/data');

const SENTENCE_FILES = [
  'sentences_de.json',
  'sentences_fr.json',
  'sentences_es.json',
  'sentences_hu.json',
];

const BATCH_SIZE = 100;

async function seedSentences() {
  const client = await pool.connect();

  try {
    // Ensure the table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS sentence_templates (
        id VARCHAR(100) PRIMARY KEY,
        language VARCHAR(10) NOT NULL,
        cefr_level VARCHAR(10) NOT NULL,
        sentence TEXT NOT NULL,
        answer TEXT NOT NULL,
        answer_word_id VARCHAR(100),
        distractors TEXT,
        hint TEXT,
        grammar_topic VARCHAR(100),
        difficulty INTEGER DEFAULT 1
      );
    `);

    let totalImported = 0;

    for (const fileName of SENTENCE_FILES) {
      const filePath = path.join(DATA_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        console.log(`  Skipping ${fileName} (file not found)`);
        continue;
      }

      console.log(`Loading ${fileName}...`);
      const sentences = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`   ${sentences.length} templates found`);

      let fileImported = 0;

      for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
        const batch = sentences.slice(i, i + BATCH_SIZE);

        const values = [];
        const params = [];
        let paramIndex = 1;

        for (const s of batch) {
          values.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`
          );
          params.push(
            s.id,
            s.language,
            s.cefr_level,
            s.sentence,
            s.answer,
            s.answer_word_id || null,
            JSON.stringify(s.distractors || []),
            s.hint || null,
            s.grammar_topic || null,
            s.difficulty || 1
          );
          paramIndex += 10;
        }

        if (values.length > 0) {
          const query = `
            INSERT INTO sentence_templates (id, language, cefr_level, sentence, answer, answer_word_id, distractors, hint, grammar_topic, difficulty)
            VALUES ${values.join(', ')}
            ON CONFLICT (id) DO NOTHING
          `;
          const result = await client.query(query, params);
          fileImported += result.rowCount;
        }
      }

      console.log(`   Imported ${fileImported} sentence templates`);
      totalImported += fileImported;
    }

    const countResult = await client.query('SELECT COUNT(*) as count FROM sentence_templates');
    console.log(`\nSeed complete.`);
    console.log(`   Imported: ${totalImported}`);
    console.log(`   Total in database: ${parseInt(countResult.rows[0].count)}`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedSentences();
