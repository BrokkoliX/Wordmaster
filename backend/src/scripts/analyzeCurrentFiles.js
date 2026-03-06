/**
 * Analyze current vocabulary files to identify enhancement opportunities
 */

const fs = require('fs');
const path = require('path');

const DICTIONARIES_DIR = path.resolve(__dirname, '../../../dictionaries');
const MOBILE_DATA_DIR = path.resolve(__dirname, '../../../mobile/src/data');

async function analyzeFiles() {
  console.log('📊 Current Vocabulary Analysis');
  console.log('=' .repeat(60));
  
  // Check dictionary files
  console.log('\n📁 Dictionary Files (/dictionaries/):');
  const dictFiles = fs.readdirSync(DICTIONARIES_DIR).filter(f => f.endsWith('.jsonl'));
  
  for (const file of dictFiles) {
    const filePath = path.join(DICTIONARIES_DIR, file);
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(line => line.trim());
    
    // Sample first few entries to understand structure
    const samples = lines.slice(0, 3).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    console.log(`\n${file}:`);
    console.log(`  📊 Total entries: ${lines.length.toLocaleString()}`);
    
    if (samples.length > 0) {
      const sample = samples[0];
      console.log(`  🔍 Sample structure: ${Object.keys(sample).join(', ')}`);
      console.log(`  📝 Example: "${sample.word || sample.source_word || 'N/A'}" → "${sample.translation || sample.target_word || 'N/A'}"`);
    }
  }
  
  // Check mobile data files  
  console.log('\n📱 Mobile Data Files (/mobile/src/data/):');
  const mobileFiles = fs.readdirSync(MOBILE_DATA_DIR).filter(f => f.startsWith('words_') && f.endsWith('.json'));
  
  const languageStats = {};
  
  for (const file of mobileFiles) {
    const filePath = path.join(MOBILE_DATA_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const count = Array.isArray(data) ? data.length : Object.keys(data).length;
    
    // Extract language from filename
    const langMatch = file.match(/words_([a-z_]+)\.json/);
    const langKey = langMatch ? langMatch[1] : file;
    
    if (!languageStats[langKey]) {
      languageStats[langKey] = { files: 0, totalWords: 0 };
    }
    
    languageStats[langKey].files++;
    languageStats[langKey].totalWords += count;
    
    console.log(`  ${file}: ${count.toLocaleString()} entries`);
  }
  
  // Summarize by language
  console.log('\n🌍 Language Summary:');
  for (const [lang, stats] of Object.entries(languageStats)) {
    console.log(`  ${lang}: ${stats.totalWords.toLocaleString()} total words across ${stats.files} files`);
  }
  
  // Check for potential improvements
  console.log('\n🎯 Enhancement Opportunities:');
  
  // Find languages with smaller vocabularies
  const smallLanguages = Object.entries(languageStats)
    .filter(([, stats]) => stats.totalWords < 200000)
    .sort(([, a], [, b]) => a.totalWords - b.totalWords);
    
  if (smallLanguages.length > 0) {
    console.log('\n📈 Languages that could benefit from vocabulary expansion:');
    smallLanguages.forEach(([lang, stats]) => {
      console.log(`  • ${lang}: ${stats.totalWords.toLocaleString()} words (could add FreeDict data)`);
    });
  }
  
  // Check dictionary vs mobile data consistency
  console.log('\n🔄 Data Source Comparison:');
  console.log('Dictionary files have significantly more entries than mobile files.');
  console.log('This suggests you could:');
  console.log('  1. Import more data from dictionaries/ to your database');
  console.log('  2. Add FreeDict data to supplement existing vocabularies');
  console.log('  3. Improve filtering to get higher-quality subsets');
  
  // Provide specific recommendations
  console.log('\n💡 Recommended Actions:');
  console.log('1. Start with Hungarian (smallest vocabulary) - add FreeDict data');
  console.log('2. Enhance German and French with FreeDict for better coverage');
  console.log('3. Add frequency rankings to improve CEFR level assignments');
  console.log('4. Consider cross-language validation for translation accuracy');
}

if (require.main === module) {
  analyzeFiles().catch(console.error);
}

module.exports = { analyzeFiles };