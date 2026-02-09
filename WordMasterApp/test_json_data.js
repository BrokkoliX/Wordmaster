/**
 * Test JSON Data Validity
 * Quick script to verify words_translated.json is valid and importable
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 Testing JSON Data File\n');

const jsonPath = path.join(__dirname, 'src', 'data', 'words_translated.json');

console.log(`Looking for: ${jsonPath}`);

if (!fs.existsSync(jsonPath)) {
  console.log('❌ File not found!');
  process.exit(1);
}

console.log('✅ File exists\n');

// Get file size
const stats = fs.statSync(jsonPath);
console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

if (stats.size > 10 * 1024 * 1024) {
  console.log('⚠️  Warning: File is over 10MB, may cause issues with React Native imports');
}

// Try to parse
console.log('\nParsing JSON...');
try {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`✅ Valid JSON`);
  console.log(`   Total entries: ${data.length.toLocaleString()}`);
  
  // Analyze data
  if (data.length > 0) {
    console.log('\n📊 Data Analysis:');
    
    // First entry
    console.log('   First entry:', data[0]);
    
    // Count valid entries (with translations)
    const validWords = data.filter(w => 
      w.source_word && 
      w.source_word.trim() !== '' && 
      !w.source_word.startsWith('[TRANSLATE')
    );
    
    console.log(`\n   Valid words (with translation): ${validWords.length.toLocaleString()}`);
    console.log(`   Needs translation: ${data.length - validWords.length}`);
    
    // CEFR breakdown
    const cefrCounts = {};
    validWords.forEach(w => {
      cefrCounts[w.cefr_level] = (cefrCounts[w.cefr_level] || 0) + 1;
    });
    
    console.log('\n   By CEFR Level:');
    Object.entries(cefrCounts).sort().forEach(([level, count]) => {
      console.log(`     ${level}: ${count.toLocaleString()} words`);
    });
    
    // Sample words
    console.log('\n   Sample words:');
    validWords.slice(0, 5).forEach((w, i) => {
      console.log(`     ${i+1}. ${w.source_word} → ${w.target_word} (${w.cefr_level})`);
    });
    
    // Check for required fields
    console.log('\n🔍 Field Validation:');
    const requiredFields = ['id', 'source_word', 'target_word', 'cefr_level', 'frequency_rank'];
    const missingFields = new Map();
    
    data.forEach((w, idx) => {
      requiredFields.forEach(field => {
        if (!w[field]) {
          if (!missingFields.has(field)) {
            missingFields.set(field, []);
          }
          missingFields.get(field).push(idx);
        }
      });
    });
    
    if (missingFields.size === 0) {
      console.log('   ✅ All entries have required fields');
    } else {
      console.log('   ⚠️  Missing fields detected:');
      missingFields.forEach((indices, field) => {
        console.log(`     ${field}: missing in ${indices.length} entries`);
      });
    }
    
    console.log('\n✅ JSON file is valid and ready for import!');
    console.log(`\n📝 Import will add approximately ${validWords.length.toLocaleString()} words to the database.`);
    
  } else {
    console.log('❌ JSON file is empty!');
  }
  
} catch (error) {
  console.log(`❌ Error parsing JSON: ${error.message}`);
  process.exit(1);
}

console.log('\n');
