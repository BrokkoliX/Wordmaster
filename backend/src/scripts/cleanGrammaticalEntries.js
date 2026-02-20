/**
 * Clean existing PostgreSQL database by removing grammatical description entries.
 *
 * Run this on your AWS RDS database to remove problematic entries that
 * may have been imported before the filtering was added.
 *
 * Usage:
 *   node src/scripts/cleanGrammaticalEntries.js            # dry-run
 *   node src/scripts/cleanGrammaticalEntries.js --apply     # delete rows
 */

require('dotenv').config();
const { pool } = require('../config/database');

const APPLY = process.argv.includes('--apply');

async function cleanGrammaticalEntries() {
  const client = await pool.connect();

  try {
    console.log('Cleaning grammatical description entries from database...');
    console.log('Mode: ' + (APPLY ? 'APPLY (will delete rows)' : 'DRY-RUN (count only)'));
    console.log('');

    // Count entries before cleaning
    const beforeCount = await client.query('SELECT COUNT(*) as count FROM words');
    console.log(`Total words before cleaning: ${parseInt(beforeCount.rows[0].count).toLocaleString()}`);

    // Build the WHERE clause for all bad entries
    const deleteCondition = `
      WHERE
        -- Placeholder entries
        translation LIKE '[TRANSLATE%'
        OR translation LIKE '[NEED%'
        OR word LIKE '[TRANSLATE%'
        OR word LIKE '[NEED%'

        -- Grammatical cases (covers Hungarian, German, Latin-based)
        OR translation ILIKE '%nominative%'
        OR translation ILIKE '%accusative%'
        OR translation ILIKE '%dative%'
        OR translation ILIKE '%genitive%'
        OR translation ILIKE '%ablative%'
        OR translation ILIKE '%vocative%'
        OR translation ILIKE '%inessive%'
        OR translation ILIKE '%illative%'
        OR translation ILIKE '%elative%'
        OR translation ILIKE '%superessive%'
        OR translation ILIKE '%sublative%'
        OR translation ILIKE '%delative%'
        OR translation ILIKE '%adessive%'
        OR translation ILIKE '%allative%'
        OR translation ILIKE '%translative%'
        OR translation ILIKE '%terminative%'
        OR translation ILIKE '%essive%'
        OR translation ILIKE '%causal-final%'
        OR translation ILIKE '%sociative%'
        OR translation ILIKE '%partitive%'
        OR translation ILIKE '%comitative%'
        OR translation ILIKE '%distributive%'

        -- Person markers
        OR translation ILIKE '%first-person%'
        OR translation ILIKE '%first person%'
        OR translation ILIKE '%second-person%'
        OR translation ILIKE '%second person%'
        OR translation ILIKE '%third-person%'
        OR translation ILIKE '%third person%'

        -- Tense / participle descriptions
        OR translation ILIKE '%past tense%'
        OR translation ILIKE '%past-tense%'
        OR translation ILIKE '%past participle%'
        OR translation ILIKE '%past-participle%'
        OR translation ILIKE '%present tense%'
        OR translation ILIKE '%present-tense%'
        OR translation ILIKE '%present participle%'
        OR translation ILIKE '%present-participle%'
        OR translation ILIKE '%future tense%'
        OR translation ILIKE '%future-tense%'
        OR translation ILIKE '%preterite of%'
        OR translation ILIKE '%imperfect of%'

        -- Moods
        OR translation ILIKE '%imperative of%'
        OR translation ILIKE '%imperative form%'
        OR translation ILIKE '%subjunctive of%'
        OR translation ILIKE '%subjunctive form%'
        OR translation ILIKE '%infinitive of%'
        OR translation ILIKE '%conditional of%'

        -- Morphological terms
        OR translation ILIKE '%inflection of%'
        OR translation ILIKE '%conjugation of%'
        OR translation ILIKE '%declension of%'
        OR translation ILIKE '%form of%'
        OR translation ILIKE '%singular of%'
        OR translation ILIKE '%plural of%'
        OR translation ILIKE '%disjunctive form%'
        OR translation ILIKE '%alternative form%'
        OR translation ILIKE '%comparative of%'
        OR translation ILIKE '%superlative of%'
        OR translation ILIKE '%causative of%'
        OR translation ILIKE '%frequentative of%'
        OR translation ILIKE '%diminutive of%'
        OR translation ILIKE '%augmentative of%'
        OR translation ILIKE '%supine of%'
        OR translation ILIKE '%gerund of%'
        OR translation ILIKE '%participle of%'
        OR translation ILIKE '%contraction of%'
        OR translation ILIKE '%apocopic form%'
        OR translation ILIKE '%clitic form%'
        OR translation ILIKE '%prevocalic form%'
        OR translation ILIKE '%feminine of%'
        OR translation ILIKE '%masculine of%'

        -- Gender markers
        OR translation ILIKE '%masculine%'
        OR translation ILIKE '%feminine%'
        OR translation ILIKE '%neuter%'

        -- Annotation terms
        OR translation ILIKE '%interrogative%'
        OR translation ILIKE '%initialism%'
        OR translation ILIKE '%abbreviation of%'
        OR translation ILIKE '%acronym%'
        OR translation ILIKE '%refers to%'
        OR translation ILIKE '%used to%'
        OR translation ILIKE '%indicates%'
        OR translation ILIKE '%denotes%'
        OR translation ILIKE '%literally%'
        OR translation ILIKE '%substitutes for%'
        OR translation ILIKE '%distal demonstrative%'
        OR translation ILIKE '%version anglaise%'
        OR translation ILIKE '%dubbed in%'
        OR translation ILIKE '%english-language%'

        -- Alphabet descriptions
        OR translation ILIKE '%letter of the%alphabet%'
        OR translation ILIKE '%called%written in%'

        -- Same checks on the word column
        OR word ILIKE '%nominative%'
        OR word ILIKE '%accusative%'
        OR word ILIKE '%dative%'
        OR word ILIKE '%genitive%'
        OR word ILIKE '%inflection of%'
        OR word ILIKE '%form of%'
        OR word ILIKE '%singular of%'
        OR word ILIKE '%plural of%'
        OR word ILIKE '%first-person%'
        OR word ILIKE '%second-person%'
        OR word ILIKE '%third-person%'
        OR word ILIKE '%past participle%'
        OR word ILIKE '%present participle%'
        OR word ILIKE '%interrogative%'
        OR word ILIKE '%letter of the%alphabet%'

        -- Entries that are too long (definitions, not translations)
        OR LENGTH(translation) > 80
        OR LENGTH(word) > 80
    `;

    // Count what would be removed
    const countToRemove = await client.query(`SELECT COUNT(*) as count FROM words ${deleteCondition}`);
    const removeCount = parseInt(countToRemove.rows[0].count);
    console.log(`Entries matching grammatical patterns: ${removeCount.toLocaleString()}`);

    if (APPLY && removeCount > 0) {
      const result = await client.query(`DELETE FROM words ${deleteCondition}`);
      console.log(`Removed ${result.rowCount.toLocaleString()} grammatical entries`);

      // Clean up orphaned progress entries
      console.log('Cleaning orphaned progress entries...');
      const cleanProgress = await client.query(`
        DELETE FROM user_word_progress
        WHERE word_id NOT IN (SELECT id FROM words)
      `);
      if (cleanProgress.rowCount > 0) {
        console.log(`   Removed ${cleanProgress.rowCount} orphaned progress entries`);
      } else {
        console.log('   No orphaned progress entries found');
      }
    } else if (!APPLY) {
      console.log('(dry-run: no rows deleted)');

      // Show some examples of what would be removed
      const examples = await client.query(`
        SELECT word, translation, target_lang
        FROM words ${deleteCondition}
        ORDER BY RANDOM()
        LIMIT 15
      `);
      if (examples.rows.length > 0) {
        console.log('\nSample entries that would be removed:');
        examples.rows.forEach((row, i) => {
          console.log(`  ${i + 1}. [${row.target_lang}] ${row.word} -> ${row.translation.substring(0, 60)}`);
        });
      }
    }

    // Count entries after cleaning
    const afterCount = await client.query('SELECT COUNT(*) as count FROM words');
    console.log(`\nTotal words after: ${parseInt(afterCount.rows[0].count).toLocaleString()}`);

    // Show breakdown by language
    console.log('\nWords by language:');
    const langStats = await client.query(`
      SELECT target_lang, COUNT(*) as count
      FROM words
      GROUP BY target_lang
      ORDER BY count DESC
    `);
    langStats.rows.forEach(s => {
      console.log(`   ${s.target_lang}: ${parseInt(s.count).toLocaleString()} words`);
    });

    if (APPLY) {
      console.log('\nDatabase cleaned successfully.');
    } else {
      console.log('\nThis was a DRY RUN. To apply, run:');
      console.log('  node src/scripts/cleanGrammaticalEntries.js --apply');
    }

  } catch (error) {
    console.error('Error cleaning database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanGrammaticalEntries();
