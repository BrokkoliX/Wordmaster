/**
 * Batch import multiple language pairs from FreeDict.org
 * 
 * Usage:
 *   node src/scripts/batchLanguageImport.js --languages=it,nl,pl,cs
 *   node src/scripts/batchLanguageImport.js --all-new
 *   node src/scripts/batchLanguageImport.js --priority-only
 */

require('dotenv').config();
const { enhancedImport } = require('./enhancedFreeDictImporter');

// Define language import batches
const LANGUAGE_BATCHES = {
  priority: [
    'eng-ita', 'ita-eng',  // Italian
    'eng-nld', 'nld-eng',  // Dutch
    'eng-pol', 'pol-eng',  // Polish
    'eng-ces', 'ces-eng'   // Czech
  ],
  
  medium: [
    'eng-dan', 'dan-eng',  // Danish
    'eng-swe', 'swe-eng',  // Swedish  
    'eng-nor', 'nor-eng',  // Norwegian
    'eng-fin', 'fin-eng'   // Finnish
  ],
  
  advanced: [
    'eng-ron', 'ron-eng',  // Romanian
    'eng-bul', 'bul-eng',  // Bulgarian
  ],
  
  // Cross-language pairs (non-English hubs)
  cross: [
    'fra-ita', 'ita-fra',  // French-Italian
    'deu-nld', 'nld-deu',  // German-Dutch
    'spa-ita', 'ita-spa'   // Spanish-Italian
  ]
};

const ALL_NEW = [
  ...LANGUAGE_BATCHES.priority,
  ...LANGUAGE_BATCHES.medium,
  ...LANGUAGE_BATCHES.advanced
];

async function importLanguageBatch(langPairs, options = {}) {
  console.log(`\n🚀 Starting batch import of ${langPairs.length} language pairs...`);
  
  const results = {
    successful: [],
    failed: [],
    totalImported: 0,
    totalSkipped: 0
  };
  
  for (const [index, langPair] of langPairs.entries()) {
    console.log(`\n[${index + 1}/${langPairs.length}] Processing ${langPair}...`);
    
    try {
      const result = await enhancedImport(langPair, options);
      results.successful.push({
        langPair,
        imported: result.imported,
        skipped: result.skipped
      });
      results.totalImported += result.imported;
      results.totalSkipped += result.skipped;
      
      console.log(`✅ ${langPair}: ${result.imported} words imported, ${result.skipped} skipped`);
      
      // Small delay to avoid overwhelming the server
      if (index < langPairs.length - 1) {
        console.log('   Waiting 2 seconds before next import...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`❌ ${langPair}: ${error.message}`);
      results.failed.push({ langPair, error: error.message });
    }
  }
  
  return results;
}

function printSummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 BATCH IMPORT SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`📥 Total words imported: ${results.totalImported.toLocaleString()}`);
  console.log(`⏭️  Total words skipped: ${results.totalSkipped.toLocaleString()}`);
  
  if (results.successful.length > 0) {
    console.log('\n✅ Successful imports:');
    results.successful.forEach(({ langPair, imported, skipped }) => {
      console.log(`   ${langPair}: ${imported.toLocaleString()} imported, ${skipped} skipped`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed imports:');
    results.failed.forEach(({ langPair, error }) => {
      console.log(`   ${langPair}: ${error}`);
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  let langPairs;
  
  if (args.includes('--all-new')) {
    langPairs = ALL_NEW;
  } else if (args.includes('--priority-only')) {
    langPairs = LANGUAGE_BATCHES.priority;
  } else if (args.includes('--medium-only')) {
    langPairs = LANGUAGE_BATCHES.medium;
  } else if (args.includes('--cross-only')) {
    langPairs = LANGUAGE_BATCHES.cross;
  } else {
    const langArg = args.find(arg => arg.startsWith('--languages='));
    if (langArg) {
      const codes = langArg.split('=')[1].split(',');
      langPairs = [];
      for (const code of codes) {
        langPairs.push(`eng-${code.trim()}`, `${code.trim()}-eng`);
      }
    } else {
      console.error('Usage options:');
      console.error('  --all-new              Import all new language pairs');
      console.error('  --priority-only         Import priority pairs only');
      console.error('  --medium-only           Import medium priority pairs');
      console.error('  --cross-only            Import cross-language pairs');
      console.error('  --languages=it,nl,pl    Import specific languages (both directions)');
      process.exit(1);
    }
  }
  
  console.log(`Selected language pairs: ${langPairs.join(', ')}`);
  
  // Confirm before starting
  if (langPairs.length > 4) {
    console.log('\n⚠️  This will import many dictionaries. Continue? (y/N)');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    const confirmation = await new Promise(resolve => {
      process.stdin.once('data', data => {
        const response = data.toString().toLowerCase();
        resolve(response === 'y' || response === 'yes');
      });
    });
    
    if (!confirmation) {
      console.log('Import cancelled.');
      process.exit(0);
    }
  }
  
  try {
    const results = await importLanguageBatch(langPairs);
    printSummary(results);
    
    if (results.failed.length === 0) {
      console.log('\n🎉 All imports completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some imports failed. Check the summary above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Batch import failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { importLanguageBatch, LANGUAGE_BATCHES };