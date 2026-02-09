# Debugging: No Words Issue

## Problem
The application shows no words when testing.

## Root Cause
The app creates a fresh SQLite database when it first launches and imports words from `words_translated.json`. If this import fails or hasn't completed, you'll see no words.

## Current Status

### ✅ What's Working:
1. **JSON Data File EXISTS**: `WordMasterApp/src/data/words_translated.json` with 6,423 words
2. **Pre-built Database EXISTS**: `WordMasterApp/wordmaster.db` with 29,999 words  
3. **Database Schema**: Correctly defined in `src/services/database.js`

### ❌ What's Not Working:
- The app creates its own database in Expo's sandbox and tries to import from JSON
- Empty database at project root (`./wordmaster.db`) - not used by app
- Import process may not be completing or may be failing silently

## Solutions

### Solution 1: Reset App and Trigger Fresh Import (RECOMMENDED)

1. **Clear app storage** (this will delete the empty database and force re-import):
   ```bash
   # For iOS Simulator
   npx expo start
   # Then press Shift+i to open iOS simulator
   # Then in the simulator: Settings > General > iPhone Storage > WordMaster > Delete App
   
   # Or use this command
   xcrun simctl privacy booted reset all com.yourname.wordmaster
   ```

2. **Reinstall and watch console**:
   ```bash
   cd /Users/robbie/Tab/Projects/Wordmaster/WordMasterApp
   npx expo start -c  # -c clears cache
   ```

3. **Check console logs** for:
   - "📥 Database is empty. Importing 30,000 words..."
   - "✅ Import complete! Database now contains X words"
   - Any error messages during import

### Solution 2: Verify JSON Import Path

The import file path might be incorrect. Check `WordMasterApp/src/services/importWords.js`:

```javascript
import wordsData from '../data/words_translated.json';
```

This should resolve to: `WordMasterApp/src/data/words_translated.json`

Verify the file exists:
```bash
ls -lh /Users/robbie/Tab/Projects/Wordmaster/WordMasterApp/src/data/words_translated.json
```

### Solution 3: Use Pre-built Database (Alternative)

Instead of importing from JSON, you can use the pre-built database:

1. **Option A**: Copy the pre-built database to Expo's location (difficult, Expo manages this)

2. **Option B**: Bundle the database with the app:
   - Move `WordMasterApp/wordmaster.db` to `WordMasterApp/assets/`
   - Update database initialization to copy from assets to app storage
   - See: https://docs.expo.dev/versions/latest/sdk/sqlite/#loading-an-existing-database

### Solution 4: Check Import Logic

The import happens in `initDatabase()` in `src/services/database.js`:

```javascript
// Check if words are already loaded
let wordCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM words');

if (wordCount.count === 0) {
  console.log('📥 Database is empty. Importing 30,000 words...');
  await importAllWords();  // <-- This should import from JSON
}
```

Check if `importAllWords()` is actually being called and completing.

## Debugging Steps

### Step 1: Check Console Logs

When you start the app, you should see:
```
Initializing WordMaster...
Initializing database...
✅ Database contains 6,423 words
Database initialized successfully
```

If you see "Database is empty" followed by "Importing...", the import should proceed.

### Step 2: Add Debug Logging

Edit `WordMasterApp/src/services/importWords.js` and add more logging:

```javascript
export const importAllWords = async () => {
  try {
    console.log('📥 Starting word import...');
    console.log(`   JSON file loaded: ${wordsData ? 'YES' : 'NO'}`);
    console.log(`   Total words to import: ${wordsData.length.toLocaleString()}`);
    
    // ... rest of code
```

### Step 3: Verify JSON File Size

Large JSON files can cause issues. Check the size:
```bash
ls -lh /Users/robbie/Tab/Projects/Wordmaster/WordMasterApp/src/data/words_translated.json
```

If it's over 5-10MB, consider splitting it or using the pre-built database approach.

### Step 4: Check for Import Errors

Look for these error messages in console:
- "Error importing words:"
- "❌ Error importing words:"
- "Error importing word ${word.id}:"

### Step 5: Manually Test Import

Create a test script:

```javascript
// test_import.js
const words = require('./WordMasterApp/src/data/words_translated.json');
console.log(`Total words in JSON: ${words.length}`);
console.log(`First word:`, words[0]);
console.log(`Last word:`, words[words.length - 1]);

// Check for issues
const noSourceWord = words.filter(w => !w.source_word || w.source_word.startsWith('[TRANSLATE'));
console.log(`Words without translation: ${noSourceWord.length}`);
```

Run it:
```bash
node test_import.js
```

## Expected Behavior

### On First Launch:
1. App calls `initDatabase()`
2. Creates tables (words, user_word_progress, etc.)
3. Checks word count → finds 0
4. Calls `importAllWords()`
5. Imports 6,423 words from JSON (skipping ones without translations)
6. Shows words in the app

### On Subsequent Launches:
1. App calls `initDatabase()`
2. Checks word count → finds 6,423
3. Skips import
4. Shows words immediately

## Quick Fix Commands

```bash
# 1. Go to app directory
cd /Users/robbie/Tab/Projects/Wordmaster/WordMasterApp

# 2. Clear all caches
rm -rf node_modules/.cache
rm -rf .expo

# 3. Restart with clean slate
npx expo start -c

# 4. Watch console carefully for import messages
```

## If Nothing Works

### Last Resort: Manual Database Creation

1. Use the pre-built database:
   ```bash
   cd /Users/robbie/Tab/Projects/Wordmaster/WordMasterApp
   sqlite3 wordmaster.db ".dump" > database_dump.sql
   ```

2. Copy to Expo's database location (platform-specific)

3. Or recreate the database with the script:
   ```bash
   cd /Users/robbie/Tab/Projects/Wordmaster/WordMasterApp
   node scripts/createCorrectDatabase.js
   ```

## Contact Points

If the issue persists:
1. Check `STATUS_AND_ROADMAP.md` for known issues
2. Review `TESTING_INSTRUCTIONS.md`
3. Check database schema in `src/services/database.js`
4. Review import logic in `src/services/importWords.js`

## Success Indicators

✅ You'll know it's working when you see:
- Home screen shows "X words available"
- Learning screen shows Spanish/English word pairs
- Settings screen lets you select CEFR level
- No "No words available" message

---

**Updated**: Based on current investigation
**Status**: Awaiting user testing with these solutions
