# Vocabulary Filtering: Preventing Grammatical Descriptions

## Problem

The vocabulary data sources (especially German and French) contain entries that are grammatical annotations rather than actual translations:

- "nominative/accusative neuter singular of der: the"
- "dative of ich: me/to me"
- "inflection of der: accusative masculine singular"
- "the plural accusative form of XXX"

These entries cause two critical issues:

1. They are not real translations that users can learn
2. In "type" mode, users cannot possibly type these complex grammatical explanations

## Solution Overview

The solution implements a multi-layered filtering approach:

1. **Import-time filtering**: Remove grammatical descriptions during database import
2. **Runtime filtering**: Exclude them when generating questions and distractors (mobile app)
3. **Query-level filtering**: Filter them out when fetching words for review (mobile app)

## Architecture Note

This project has two database layers:
- **Backend (AWS RDS PostgreSQL)**: Central word repository, user data, and progress
- **Mobile App (Local SQLite)**: Downloaded vocabulary for offline use

The filtering is applied to **both** systems.

## Implementation

### 1. Backend Import-Time Filtering (AWS PostgreSQL)

**File**: `backend/src/scripts/seedWords.js`

Added `isGrammaticalDescription()` function that detects:
- Case markers: nominative, accusative, dative, genitive
- Grammatical forms: singular of, plural of, form of
- Linguistic terms: inflection, conjugation, declension
- Gender markers: masculine, feminine, neuter
- Tense markers: past tense, present tense
- Comparative forms: comparative of, superlative of
- Long descriptions (>100 characters)
- Multiple slashes (grammatical alternatives)

**Usage** (from project root):

```bash
cd backend
node src/scripts/seedWords.js
```

This will:
- Connect to your AWS RDS PostgreSQL database
- Import vocabulary while skipping grammatical descriptions
- Report how many entries were filtered out

**Environment Setup**: Ensure your `.env` file has the correct AWS RDS credentials:
```env
DB_HOST=your-rds-instance.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=wordmaster
DB_USER=postgres
DB_PASSWORD=your-password
```

### 1b. Mobile App Import-Time Filtering (Local SQLite)

**File**: `WordMasterApp/scripts/createCorrectDatabase.js`

The same filtering logic for the mobile app's local database.

**Usage**:

```bash
cd WordMasterApp/scripts
node createCorrectDatabase.js
```

### 2. Runtime Filtering (Distractor Generation)

**File**: `WordMasterApp/src/utils/distractorGenerator.js`

Added `GRAMMATICAL_FILTER` constant applied to all SQL queries:

```javascript
const GRAMMATICAL_FILTER = `
  AND translation NOT LIKE '%nominative%'
  AND translation NOT LIKE '%accusative%'
  AND translation NOT LIKE '%dative%'
  AND translation NOT LIKE '%genitive%'
  AND translation NOT LIKE '%inflection of%'
  AND translation NOT LIKE '%conjugation of%'
  AND translation NOT LIKE '%form of%'
  AND translation NOT LIKE '%singular of%'
  AND translation NOT LIKE '%plural of%'
  AND LENGTH(translation) < 100
  ...
`;
```

This ensures that even if a grammatical entry exists in the database, it will never be used as a distractor option.

### 3. Query-Level Filtering

**File**: `WordMasterApp/src/services/database.js`

Updated `getWordsDueForReview()` and `getNewWords()` functions to include the same grammatical filters. This prevents grammatical descriptions from being selected as the main word to learn.

### 4. Database Cleanup Utilities

#### 4a. AWS PostgreSQL Cleanup

**File**: `backend/src/scripts/cleanGrammaticalEntries.js`

For existing AWS RDS databases, run this script to remove grammatical entries:

```bash
cd backend
node src/scripts/cleanGrammaticalEntries.js
```

This will:
- Connect to your AWS RDS PostgreSQL database
- Remove all grammatical description entries
- Clean up orphaned progress entries
- Show statistics before and after cleaning

**Note**: Make sure your `.env` file is configured with AWS RDS credentials.

#### 4b. Mobile App SQLite Cleanup

**File**: `WordMasterApp/scripts/cleanGrammaticalEntries.js`

For the mobile app's local database:

```bash
cd WordMasterApp/scripts
node cleanGrammaticalEntries.js
```

This will:
- Remove all grammatical description entries from the local SQLite database
- Clean up orphaned progress entries
- Show statistics before and after cleaning

## Filtered Patterns

The system filters out entries containing:

### Case Markers
- nominative
- accusative
- dative
- genitive

### Form Indicators
- "form of"
- "singular of"
- "plural of"
- "inflection of"
- "conjugation of"
- "declension of"
- "disjunctive form"
- "alternative form"

### Gender Markers
- masculine
- feminine
- neuter

### Tense Markers
- "past tense"
- "present tense"

### Comparative Forms
- "comparative of"
- "superlative of"

### Length-Based Filtering
- Translations longer than 100 characters (likely definitions)
- Entries with more than 2 slashes (grammatical alternatives)

## Testing

After implementing the filters, verify they work:

### Testing AWS Backend (PostgreSQL)

1. **Re-import words to AWS**:
   ```bash
   cd backend
   
   # Optional: Clean existing data first
   node src/scripts/cleanGrammaticalEntries.js
   
   # Re-import with filters
   node src/scripts/seedWords.js
   ```

2. **Check filtered count**: The script will report how many grammatical entries were skipped

3. **Query AWS database directly** (optional):
   ```bash
   # Connect to AWS RDS (replace with your endpoint)
   psql -h your-rds-endpoint.region.rds.amazonaws.com -U postgres -d wordmaster
   
   # Check for grammatical entries (should return 0)
   SELECT COUNT(*) FROM words WHERE translation ILIKE '%nominative%';
   
   # View sample data
   SELECT word, translation FROM words LIMIT 10;
   ```

### Testing Mobile App (SQLite)

1. **Regenerate mobile database**:
   ```bash
   cd WordMasterApp/scripts
   node createCorrectDatabase.js
   ```

2. **Check filtered count**: The script will report how many grammatical entries were skipped

3. **Test in app**:
   - Start a learning session
   - Verify no grammatical descriptions appear as questions or options
   - Try "type" mode to ensure all answers are typeable

4. **Query mobile database directly** (optional):
   ```bash
   sqlite3 WordMasterApp/wordmaster.db
   SELECT word, translation FROM words WHERE translation LIKE '%nominative%' LIMIT 10;
   ```
   Should return no results.

## Performance Impact

The filtering adds minimal overhead:
- Import time: ~5-10% slower due to pattern matching
- Runtime: Negligible (SQL LIKE clauses are fast with proper indexing)
- User experience: Significantly improved (no confusing entries)

## Future Improvements

Consider these enhancements:

1. **Smarter extraction**: For entries like "dative of ich: me", extract just "me"
2. **Language-specific filters**: Some languages may have unique patterns
3. **Machine learning**: Train a classifier to identify grammatical descriptions
4. **Data source improvement**: Work with better vocabulary sources
5. **User reporting**: Let users flag problematic entries

## Maintenance

When adding new language pairs:

1. Check sample data for grammatical patterns
2. Add language-specific filter patterns if needed
3. Test with small dataset first
4. Monitor user feedback for missed patterns

## Related Files

- `WordMasterApp/scripts/createCorrectDatabase.js` - Import filtering
- `WordMasterApp/scripts/cleanGrammaticalEntries.js` - Database cleanup
- `WordMasterApp/src/utils/distractorGenerator.js` - Runtime filtering
- `WordMasterApp/src/services/database.js` - Query filtering
- `WordMasterApp/src/data/words_*.json` - Source vocabulary data

## Contact

If you encounter grammatical descriptions that slip through the filters, please:
1. Note the exact text
2. Identify the language pair
3. Add the pattern to the filter lists
4. Regenerate the database
