/**
 * Quick enhancement script for existing languages
 * 
 * Usage:
 *   node src/scripts/quickEnhanceExisting.js --small-languages
 *   node src/scripts/quickEnhanceExisting.js --all-languages
 *   node src/scripts/quickEnhanceExisting.js --language=hu
 */

const { enhancedImport } = require('./enhancedFreeDictImporter');

const ENHANCEMENT_PLAN = {
  // Priority 1: Small vocabularies that need expansion
  small: {
    'hu': ['eng-hun', 'hun-eng'],  // Hungarian: ~75k → target 150k+
  },
  
  // Priority 2: Medium vocabularies that could be improved  
  medium: {
    'de': ['eng-deu', 'deu-eng'],  // German: ~120k → target 200k+
    'fr': ['eng-fra', 'fra-eng'],  // French: ~130k → target 250k+
  },
  
  // Priority 3: Large vocabularies - quality over quantity
  large: {
    'pt': ['eng-por', 'por-eng'],  // Portuguese: check for gaps
    'ru': ['eng-rus', 'rus-eng'],  // Russian: check for gaps
    // Spanish already very large - skip for now
  }
};

async function enhanceLanguage(langCode, langPairs) {
  const langNames = {
    'hu': 'Hungarian', 'de': 'German', 'fr': 'French',
    'pt': 'Portuguese', 'ru': 'Russian', 'es': 'Spanish'
  };
  
  console.log(`\n🚀 Enhancing ${langNames[langCode]} vocabulary...`);
  console.log(`Target pairs: ${langPairs.join(', ')}`);
  
  let totalAdded = 0;
  let totalSkipped = 0;
  
  for (const pair of langPairs) {
    console.log(`\n📥 Importing ${pair}...`);
    try {
      const result = await enhancedImport(pair);
      console.log(`✅ Success: +${result.imported.toLocaleString()} words, ${result.skipped} duplicates`);
      totalAdded += result.imported;
      totalSkipped += result.skipped;
      
      // Brief pause between imports
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed ${pair}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 ${langNames[langCode]} Enhancement Results:`);
  console.log(`   ✅ New words added: ${totalAdded.toLocaleString()}`);
  console.log(`   ⏭️  Skipped (duplicates): ${totalSkipped.toLocaleString()}`);
  
  if (totalAdded > 0) {
    const improvement = ((totalAdded / (totalAdded + totalSkipped)) * 100).toFixed(1);
    console.log(`   📈 Vocabulary expansion: ${improvement}% new content`);
  }
  
  return { added: totalAdded, skipped: totalSkipped };
}

async function main() {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--small-languages')) {
      console.log('🎯 Enhancing languages with small vocabularies...');
      for (const [lang, pairs] of Object.entries(ENHANCEMENT_PLAN.small)) {
        await enhanceLanguage(lang, pairs);
      }
      
    } else if (args.includes('--medium-languages')) {
      console.log('🎯 Enhancing languages with medium vocabularies...');
      for (const [lang, pairs] of Object.entries(ENHANCEMENT_PLAN.medium)) {
        await enhanceLanguage(lang, pairs);
      }
      
    } else if (args.includes('--all-languages')) {
      console.log('🎯 Enhancing all existing languages...');
      const allPlans = { ...ENHANCEMENT_PLAN.small, ...ENHANCEMENT_PLAN.medium, ...ENHANCEMENT_PLAN.large };
      for (const [lang, pairs] of Object.entries(allPlans)) {
        await enhanceLanguage(lang, pairs);
      }
      
    } else {
      const langArg = args.find(arg => arg.startsWith('--language='));
      if (langArg) {
        const lang = langArg.split('=')[1];
        const allPlans = { ...ENHANCEMENT_PLAN.small, ...ENHANCEMENT_PLAN.medium, ...ENHANCEMENT_PLAN.large };
        const pairs = allPlans[lang];
        
        if (pairs) {
          await enhanceLanguage(lang, pairs);
        } else {
          console.error(`Unknown language: ${lang}`);
          console.log('Available languages:', Object.keys(allPlans).join(', '));
        }
      } else {
        console.log('🎯 Wordmaster Vocabulary Enhancement');
        console.log('=====================================');
        console.log('');
        console.log('Choose an enhancement strategy:');
        console.log('');
        console.log('Quick wins:');
        console.log('  --small-languages    Enhance Hungarian (biggest impact)');
        console.log('  --language=hu         Enhance Hungarian only');
        console.log('');
        console.log('Medium effort:');  
        console.log('  --medium-languages   Enhance German & French');
        console.log('  --language=de         Enhance German only');
        console.log('  --language=fr         Enhance French only');
        console.log('');
        console.log('Full enhancement:');
        console.log('  --all-languages      Enhance all existing languages');
        console.log('');
        console.log('Current vocabulary sizes:');
        console.log('  🇭🇺 Hungarian: ~75k  (priority - smallest)');
        console.log('  🇩🇪 German:    ~120k (good candidate)'); 
        console.log('  🇫🇷 French:    ~130k (good candidate)');
        console.log('  🇵🇹 Portuguese: ~330k (already large)');
        console.log('  🇷🇺 Russian:    ~330k (already large)');
        console.log('  🇪🇸 Spanish:    ~800k (very large)');
      }
    }
    
  } catch (error) {
    console.error('\n💥 Enhancement failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { enhanceLanguage, ENHANCEMENT_PLAN };