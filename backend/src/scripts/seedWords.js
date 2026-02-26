/**
 * Seed the words table in PostgreSQL from the JSON data files.
 *
 * Usage:
 *   node src/scripts/seedWords.js
 *
 * This reads every language-pair JSON file from the mobile app's data
 * directory and inserts all words into the backend database. It is
 * idempotent -- duplicate IDs are skipped via ON CONFLICT DO NOTHING.
 *
 * The JSON files should already be cleaned by cleanJsonDataFiles.js.
 * This script applies a second layer of validation as defense-in-depth.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const DATA_DIR = path.resolve(__dirname, '../../../mobile/src/data');

const LANGUAGE_FILES = [
  'words_translated.json',
  'words_french.json',
  'words_german.json',
  'words_hungarian.json',
  'words_spanish_to_english.json',
  'words_french_to_english.json',
  'words_german_to_english.json',
  'words_hungarian_to_english.json',
  'words_portuguese.json',
  'words_portuguese_to_english.json',
  'words_russian.json',
  'words_russian_to_english.json',
];

const BATCH_SIZE = 500;

// ── Patterns that indicate the text is a grammatical description ────────
const DESCRIPTION_PATTERNS = [
  /\b(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|causal-final|causal|sociative|partitive|comitative|distributive|temporal)\s+(singular|plural|of)\b/i,
  /^(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|causal-final|causal|sociative|partitive)\b/i,
  /^(first|second|third)[\s-]person\b/i,
  /^(singular|plural|feminine|masculine|neuter)\s+(singular|plural|of)\b/i,
  /\b(singular|plural)\s+of\b/i,
  /\b(feminine|masculine)\s+(singular\s+)?of\b/i,
  /^past[\s-](tense|participle)\s+of\b/i,
  /^present[\s-](tense|participle)\s+of\b/i,
  /^future[\s-](tense)\s+of\b/i,
  /\b(inflection|conjugation|declension)\s+of\b/i,
  /\bform\s+of\b/i,
  /\bdisjunctive\s+form\b/i,
  /\balternative\s+form\s+of\b/i,
  /\b(comparative|superlative)\s+of\b/i,
  /\b(causative|frequentative|diminutive|augmentative|supine|gerund|participle)\s+of\b/i,
  /\bcontraction\s+of\b/i,
  /\bapocopic\s+form\s+of\b/i,
  /\bclitic\s+form\s+of\b/i,
  /\bprevocalic\s+form\s+of\b/i,
  /\bletter\b.*\balphabet\b/i,
  /\bcalled\b.*\bwritten in\b/i,
  /\bISO\s+3166\b/i,
  /\bversion anglaise\b/i,
  /\bdubbed in\b/i,
  /\benglish[\s-]language\b/i,
  /^(Impersonal|Personal)\s+pronoun\s+used\s+to\b/i,
  /^the\s+plural\s+personal\s+pronoun\b/i,
  /^forms\s+the\s+/i,
  /\b(initialism|abbreviation|acronym)\s+of\b/i,
  /\b(refers to|used to|indicates|denotes)\b/i,
  /\binterrogative\b/i,
  /\b(masculine|feminine|neuter)\b/i,
  /\bliterally\b/i,
  /\bsubstitutes\s+for\b/i,
  /\bdistal\s+demonstrative\b/i,
  /\bcontraction\s+of\b/i,
];

/**
 * Return true if the text is NOT a valid plain-word translation.
 */
function isBadEntry(text) {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;

  // Placeholder patterns
  if (t.startsWith('[TRANSLATE') || t.startsWith('[NEED')) return true;

  // Too long
  if (t.length > 80) return true;

  // Check description patterns
  for (const pattern of DESCRIPTION_PATTERNS) {
    if (pattern.test(t)) return true;
  }

  // More than 2 slashes
  if ((t.match(/\//g) || []).length > 2) return true;

  // Orphaned closing paren
  if (t.endsWith(')') && !t.includes('(')) return true;

  return false;
}

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
    let totalGrammatical = 0;

    for (const fileName of LANGUAGE_FILES) {
      const filePath = path.join(DATA_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        console.log(`  Skipping ${fileName} (file not found)`);
        continue;
      }

      console.log(`Loading ${fileName}...`);
      const words = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`   ${words.length.toLocaleString()} words found`);

      let fileImported = 0;
      let fileSkipped = 0;
      let fileGrammatical = 0;

      for (let i = 0; i < words.length; i += BATCH_SIZE) {
        const batch = words.slice(i, i + BATCH_SIZE);

        const values = [];
        const params = [];
        let paramIndex = 1;

        for (const w of batch) {
          // Skip invalid entries
          if (!w.source_word || w.source_word.trim() === '') {
            fileSkipped++;
            continue;
          }

          // Defense-in-depth: re-check both fields
          if (isBadEntry(w.source_word) || isBadEntry(w.target_word)) {
            fileGrammatical++;
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

        if ((i + BATCH_SIZE) % 2000 === 0) {
          console.log(`   ${Math.min(i + BATCH_SIZE, words.length).toLocaleString()} / ${words.length.toLocaleString()}...`);
        }
      }

      console.log(`   Imported ${fileImported.toLocaleString()}, skipped ${fileSkipped}, grammatical ${fileGrammatical}`);
      totalImported += fileImported;
      totalSkipped += fileSkipped;
      totalGrammatical += fileGrammatical;
    }

    // Final count
    const countResult = await client.query('SELECT COUNT(*) as count FROM words');
    console.log(`\nSeed complete.`);
    console.log(`   Imported: ${totalImported.toLocaleString()}`);
    console.log(`   Skipped (empty/invalid): ${totalSkipped}`);
    console.log(`   Skipped (grammatical): ${totalGrammatical}`);
    console.log(`   Total words in database: ${parseInt(countResult.rows[0].count).toLocaleString()}`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedWords();
