#!/usr/bin/env node

/**
 * Pipeline Stage 7: LOAD
 *
 * Reads exported JSON files from mobile/src/data/ and bulk-inserts
 * them into the PostgreSQL database.  Connects using the backend's
 * .env configuration.
 *
 * Features:
 *   - Batch INSERT (500 rows per statement) for performance
 *   - Each language pair wrapped in a transaction (atomic)
 *   - Auto-detects pipeline format (source_word/target_word) and
 *     legacy import format (word/translation)
 *   - --replace flag drops existing pair data before inserting
 *   - --dry-run flag previews without writing
 *
 * Usage:
 *   node pipeline/load.js                           # all pairs
 *   node pipeline/load.js --pair=en-fr              # single pair
 *   node pipeline/load.js --pair=en-fr --replace    # replace existing
 *   node pipeline/load.js --dry-run                 # preview only
 *   node pipeline/load.js --file=path/to/words.json # explicit file
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load environment from backend/.env
// ---------------------------------------------------------------------------

const BACKEND_DIR = path.resolve(__dirname, '..', '..', '..', 'backend');

// Resolve pg from the backend's node_modules (load.js lives in mobile/scripts/)
const { Pool } = require(path.join(BACKEND_DIR, 'node_modules', 'pg'));
const envPath = path.join(BACKEND_DIR, '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

function createPool() {
  const isProduction = process.env.NODE_ENV === 'production';
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wordmaster',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { pair: null, file: null, replace: false, dryRun: false };

  for (const arg of args) {
    if (arg === '--replace') { opts.replace = true; continue; }
    if (arg === '--dry-run') { opts.dryRun = true; continue; }
    const [key, val] = arg.replace('--', '').split('=');
    if (key === 'pair') opts.pair = val;
    if (key === 'file') opts.file = val;
  }

  return opts;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

const DATA_DIR = path.resolve(__dirname, '..', '..', 'src', 'data');

/**
 * Map a pair code like "en-fr" to candidate file names in the data directory.
 * Handles both the new naming (words_en_fr.json) and legacy naming
 * (words_french.json, words_french_to_english.json).
 */
function findPairFiles(pairCode) {
  const [source, target] = pairCode.split('-');

  // New pipeline naming
  const newName = `words_${source}_${target}.json`;
  const newPath = path.join(DATA_DIR, newName);
  if (fs.existsSync(newPath)) return [newPath];

  // Legacy naming -- try full language name
  const config = safeLoadConfig();
  if (config) {
    const targetMeta = config.languages[target];
    const sourceMeta = config.languages[source];
    if (targetMeta) {
      const legacyName = `words_${targetMeta.name.toLowerCase()}.json`;
      const legacyPath = path.join(DATA_DIR, legacyName);
      if (fs.existsSync(legacyPath)) return [legacyPath];

      // Legacy reverse naming
      if (sourceMeta) {
        const reverseName = `words_${targetMeta.name.toLowerCase()}_to_${sourceMeta.name.toLowerCase()}.json`;
        const reversePath = path.join(DATA_DIR, reverseName);
        if (fs.existsSync(reversePath)) return [reversePath];
      }
    }
  }

  return [];
}

function discoverAllFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('words_') && f.endsWith('.json'))
    .map(f => path.join(DATA_DIR, f));
}

function safeLoadConfig() {
  try {
    return require('../config/pairs.json');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Normalize a single word record to the DB schema
// ---------------------------------------------------------------------------

function normalizeRecord(record, fallbackSource, fallbackTarget) {
  const word = record.word || record.target_word || record.source_word;
  const translation = record.translation || record.source_word || record.target_word;
  const sourceLang = record.source_lang || fallbackSource;
  const targetLang = record.target_lang || fallbackTarget;

  if (!word || !translation || !sourceLang || !targetLang) return null;

  const id = record.id || `${sourceLang}-${targetLang}-${word}`.toLowerCase();

  return {
    id,
    word,
    translation,
    difficulty: record.difficulty || 1,
    category: record.category || null,
    frequency_rank: record.frequency_rank || null,
    cefr_level: record.cefr_level || 'A1',
    source_lang: sourceLang,
    target_lang: targetLang,
  };
}

// ---------------------------------------------------------------------------
// Batch insert into PostgreSQL
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;
const COLUMNS = ['id', 'word', 'translation', 'difficulty', 'category',
  'frequency_rank', 'cefr_level', 'source_lang', 'target_lang'];

async function batchInsert(client, records) {
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    let paramIdx = 1;

    for (const rec of batch) {
      const placeholders = COLUMNS.map(() => `$${paramIdx++}`);
      values.push(`(${placeholders.join(', ')})`);
      params.push(
        rec.id, rec.word, rec.translation, rec.difficulty, rec.category,
        rec.frequency_rank, rec.cefr_level, rec.source_lang, rec.target_lang
      );
    }

    const sql = `
      INSERT INTO words (${COLUMNS.join(', ')})
      VALUES ${values.join(',\n')}
      ON CONFLICT (id) DO UPDATE SET
        word = EXCLUDED.word,
        translation = EXCLUDED.translation,
        difficulty = EXCLUDED.difficulty,
        category = EXCLUDED.category,
        frequency_rank = EXCLUDED.frequency_rank,
        cefr_level = EXCLUDED.cefr_level,
        source_lang = EXCLUDED.source_lang,
        target_lang = EXCLUDED.target_lang
    `;

    await client.query(sql, params);
    inserted += batch.length;

    // Progress indicator for large imports
    if (records.length > BATCH_SIZE) {
      const pct = Math.round((Math.min(i + BATCH_SIZE, records.length) / records.length) * 100);
      process.stdout.write(`\r    ${pct}% (${Math.min(i + BATCH_SIZE, records.length).toLocaleString()}/${records.length.toLocaleString()})`);
    }
  }

  if (records.length > BATCH_SIZE) {
    process.stdout.write('\n');
  }

  return inserted;
}

// ---------------------------------------------------------------------------
// Process a single file
// ---------------------------------------------------------------------------

async function processFile(pool, filePath, opts) {
  const fileName = path.basename(filePath);
  console.log(`\n  ${fileName}`);

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(raw) || raw.length === 0) {
    console.log('    [skip] Empty or invalid JSON array');
    return { file: fileName, inserted: 0, skipped: 0 };
  }

  // Detect source/target from first record
  const sample = raw[0];
  const sourceLang = sample.source_lang || null;
  const targetLang = sample.target_lang || null;

  if (!sourceLang || !targetLang) {
    console.log('    [skip] Cannot determine language pair from data');
    return { file: fileName, inserted: 0, skipped: 0 };
  }

  // Normalize all records
  const records = [];
  let skipped = 0;
  for (const entry of raw) {
    const normalized = normalizeRecord(entry, sourceLang, targetLang);
    if (normalized) {
      records.push(normalized);
    } else {
      skipped++;
    }
  }

  console.log(`    ${sourceLang} -> ${targetLang}: ${records.length.toLocaleString()} words (${skipped} skipped)`);

  if (opts.dryRun) {
    console.log('    [dry-run] Would insert/update these records');
    return { file: fileName, inserted: records.length, skipped, dryRun: true };
  }

  // Transaction: optionally delete existing, then batch insert
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (opts.replace) {
      const del = await client.query(
        'DELETE FROM words WHERE source_lang = $1 AND target_lang = $2',
        [sourceLang, targetLang]
      );
      console.log(`    Deleted ${del.rowCount.toLocaleString()} existing rows`);
    }

    const inserted = await batchInsert(client, records);
    await client.query('COMMIT');
    console.log(`    Inserted/updated ${inserted.toLocaleString()} rows`);

    return { file: fileName, inserted, skipped };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`    [ERROR] ${err.message}`);
    return { file: fileName, inserted: 0, skipped: records.length, error: err.message };
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  console.log('=== Pipeline Stage 7: LOAD ===');
  console.log(`  Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'wordmaster'}`);
  if (opts.dryRun) console.log('  Mode: DRY RUN (no writes)');
  if (opts.replace) console.log('  Mode: REPLACE (delete before insert)');

  // Determine which files to process
  let files = [];

  if (opts.file) {
    const resolved = path.resolve(opts.file);
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      process.exit(1);
    }
    files = [resolved];
  } else if (opts.pair) {
    files = findPairFiles(opts.pair);
    if (files.length === 0) {
      console.error(`No data file found for pair: ${opts.pair}`);
      console.error(`  Looked in: ${DATA_DIR}`);
      process.exit(1);
    }
  } else {
    files = discoverAllFiles();
  }

  if (files.length === 0) {
    console.log('No word files found to import.');
    process.exit(0);
  }

  console.log(`\n  Found ${files.length} file(s) to process:`);
  files.forEach(f => console.log(`    - ${path.basename(f)}`));

  const pool = createPool();

  // Verify connection
  try {
    const res = await pool.query('SELECT COUNT(*) as count FROM words');
    console.log(`\n  Current DB word count: ${parseInt(res.rows[0].count).toLocaleString()}`);
  } catch (err) {
    console.error(`\nDatabase connection failed: ${err.message}`);
    process.exit(1);
  }

  // Process each file
  const results = [];
  for (const file of files) {
    const result = await processFile(pool, file, opts);
    results.push(result);
  }

  // Summary
  console.log('\n=== Summary ===');
  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const totalErrors = results.filter(r => r.error).length;
  console.log(`  Files processed: ${results.length}`);
  console.log(`  Total inserted/updated: ${totalInserted.toLocaleString()}`);
  console.log(`  Total skipped: ${totalSkipped.toLocaleString()}`);
  if (totalErrors > 0) {
    console.log(`  Errors: ${totalErrors}`);
    results.filter(r => r.error).forEach(r => {
      console.log(`    ${r.file}: ${r.error}`);
    });
  }

  // Final count
  if (!opts.dryRun) {
    const res = await pool.query('SELECT COUNT(*) as count FROM words');
    console.log(`  Final DB word count: ${parseInt(res.rows[0].count).toLocaleString()}`);
  }

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
