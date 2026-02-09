/**
 * Generate Vocabulary Packs for Cloud Distribution
 * 
 * Creates individual vocabulary packs (ZIP files) for each:
 * - Language pair (en-es, en-fr, es-fr, etc.)
 * - CEFR level (A1, A2, B1, B2, C1, C2)
 * 
 * Output: 120+ vocabulary packs ready for CloudFront/S3
 */

const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'wordmaster.db');
const OUTPUT_DIR = path.join(__dirname, '../../packs');

// CEFR levels
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Get all unique language pairs from database
function getLanguagePairs(db) {
  const pairs = db.prepare(`
    SELECT DISTINCT source_lang, target_lang, COUNT(*) as word_count
    FROM words
    GROUP BY source_lang, target_lang
    ORDER BY source_lang, target_lang
  `).all();
  
  return pairs;
}

// Create a vocabulary pack for a specific language pair + level
async function createPack(source, target, level) {
  const packId = `${source}-${target}-${level}`;
  console.log(`\n📦 Creating pack: ${packId}`);
  
  const tempDir = path.join(OUTPUT_DIR, 'temp', packId);
  const packDbPath = path.join(tempDir, 'words.db');
  
  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Open main database
  const mainDb = new sqlite3(DB_PATH);
  
  // Get words for this pack
  const words = mainDb.prepare(`
    SELECT * FROM words
    WHERE source_lang = ? 
      AND target_lang = ? 
      AND cefr_level = ?
    ORDER BY frequency_rank
  `).all(source, target, level);
  
  if (words.length === 0) {
    console.log(`  ⚠️  No words found, skipping`);
    mainDb.close();
    return null;
  }
  
  console.log(`  Found ${words.length} words`);
  
  // Create pack database
  const packDb = new sqlite3(packDbPath);
  
  // Create schema
  packDb.exec(`
    CREATE TABLE words (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL,
      translation TEXT NOT NULL,
      difficulty INTEGER,
      category TEXT,
      frequency_rank INTEGER,
      cefr_level TEXT,
      source_lang TEXT,
      target_lang TEXT
    );
    
    CREATE INDEX idx_frequency ON words(frequency_rank);
    CREATE INDEX idx_category ON words(category);
  `);
  
  // Insert words
  const insert = packDb.prepare(`
    INSERT INTO words 
    (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = packDb.transaction((words) => {
    for (const w of words) {
      insert.run(
        w.id, w.word, w.translation, w.difficulty, w.category,
        w.frequency_rank, w.cefr_level, w.source_lang, w.target_lang
      );
    }
  });
  
  insertMany(words);
  packDb.close();
  mainDb.close();
  
  // Create metadata
  const metadata = {
    id: packId,
    sourceLang: source,
    targetLang: target,
    cefrLevel: level,
    wordCount: words.length,
    version: '1.0.0',
    created: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(tempDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  // Create ZIP
  const zipPath = path.join(OUTPUT_DIR, `${packId}.zip`);
  
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    
    archive.pipe(output);
    archive.directory(tempDir, false);
    archive.finalize();
  });
  
  // Calculate checksum
  const fileBuffer = fs.readFileSync(zipPath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const checksum = hashSum.digest('hex');
  
  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  const fileSize = fs.statSync(zipPath).size;
  const sizeMB = (fileSize / 1024 / 1024).toFixed(2);
  
  console.log(`  ✅ Created: ${packId}.zip (${sizeMB} MB)`);
  
  return {
    ...metadata,
    fileSize,
    checksum,
    filename: `${packId}.zip`,
    url: `https://CLOUDFRONT_DOMAIN/${packId}.zip`, // Will be replaced
    bundled: level === 'A1', // Bundle A1 in app, download others
    required: level === 'A1'
  };
}

// Generate all packs
async function generateAllPacks() {
  console.log('🎁 WordMaster Vocabulary Pack Generator\n');
  console.log(`Database: ${DB_PATH}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Open database to get language pairs
  const db = new sqlite3(DB_PATH);
  const languagePairs = getLanguagePairs(db);
  db.close();
  
  console.log(`Found ${languagePairs.length} language pairs:`);
  languagePairs.forEach(pair => {
    console.log(`  ${pair.source_lang} → ${pair.target_lang}: ${pair.word_count} words`);
  });
  
  console.log(`\nGenerating packs for ${languagePairs.length} pairs × ${CEFR_LEVELS.length} levels = ${languagePairs.length * CEFR_LEVELS.length} total packs`);
  
  const allPacks = [];
  let totalSize = 0;
  
  // Generate packs for each combination
  for (const pair of languagePairs) {
    for (const level of CEFR_LEVELS) {
      try {
        const pack = await createPack(pair.source_lang, pair.target_lang, level);
        if (pack) {
          allPacks.push(pack);
          totalSize += pack.fileSize;
        }
      } catch (error) {
        console.error(`  ❌ Error creating ${pair.source_lang}-${pair.target_lang}-${level}:`, error.message);
      }
    }
  }
  
  // Create master metadata file
  const masterMetadata = {
    version: '1.0.0',
    updated: new Date().toISOString(),
    minimumAppVersion: '1.0.0',
    totalPacks: allPacks.length,
    totalSize: totalSize,
    packs: allPacks
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'metadata.json'),
    JSON.stringify(masterMetadata, null, 2)
  );
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total packs created: ${allPacks.length}`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Average pack size: ${(totalSize / allPacks.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\nPacks by level:`);
  
  CEFR_LEVELS.forEach(level => {
    const levelPacks = allPacks.filter(p => p.cefrLevel === level);
    const levelSize = levelPacks.reduce((sum, p) => sum + p.fileSize, 0);
    console.log(`  ${level}: ${levelPacks.length} packs (${(levelSize / 1024 / 1024).toFixed(2)} MB)`);
  });
  
  console.log(`\nBundled packs (A1 - will be in app):`);
  const bundled = allPacks.filter(p => p.bundled);
  const bundledSize = bundled.reduce((sum, p) => sum + p.fileSize, 0);
  console.log(`  ${bundled.length} packs (${(bundledSize / 1024 / 1024).toFixed(2)} MB)`);
  
  console.log(`\nDownloadable packs (A2-C2):`);
  const downloadable = allPacks.filter(p => !p.bundled);
  const downloadableSize = downloadable.reduce((sum, p) => sum + p.fileSize, 0);
  console.log(`  ${downloadable.length} packs (${(downloadableSize / 1024 / 1024).toFixed(2)} MB)`);
  
  console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`📋 Metadata file: ${OUTPUT_DIR}/metadata.json`);
  console.log(`\n✨ Ready to upload to AWS S3/CloudFront!\n`);
  
  return allPacks;
}

// Run if called directly
if (require.main === module) {
  generateAllPacks().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { generateAllPacks, createPack };
