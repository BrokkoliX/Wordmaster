# Vocabulary Filtering - Quick Start

Quick commands to fix the grammatical description problem.

## The Problem

Your vocabulary contains entries like:
- "nominative/accusative neuter singular of der: the"
- "dative of ich: me/to me"

Users can't learn or type these in exercises.

## The Solution

We've added automatic filtering to remove these grammatical entries.

---

## AWS Database (RDS PostgreSQL)

### Clean & Re-import (Recommended)

```bash
# SSH to your EC2 instance
ssh -i wordmaster-key.pem ubuntu@YOUR_EC2_IP

# Navigate to backend
cd ~/Wordmaster/backend

# Clean existing grammatical entries
node src/scripts/cleanGrammaticalEntries.js

# Re-import with filters (this adds new words and skips grammatical ones)
node src/scripts/seedWords.js
```

### Or Just Clean Existing Data

```bash
cd ~/Wordmaster/backend
node src/scripts/cleanGrammaticalEntries.js
```

### Verify It Worked

```bash
# Connect to database
psql -h YOUR_RDS_ENDPOINT -U postgres -d wordmaster

# Check for grammatical entries (should be 0)
SELECT COUNT(*) FROM words WHERE translation ILIKE '%nominative%';

# Exit
\q
```

---

## Mobile App Database (SQLite)

### Create Clean Database

```bash
# On your local machine
cd WordMasterApp/scripts

# Create new database with filters
node createCorrectDatabase.js
```

### Or Clean Existing Database

```bash
cd WordMasterApp/scripts
node cleanGrammaticalEntries.js
```

---

## What Gets Filtered Out

### ❌ Removed (Grammatical Descriptions)
- "nominative/accusative neuter singular of der: the"
- "dative of ich: me/to me"
- "inflection of der: accusative masculine singular"
- "feminine nominative/accusative singular of ein"
- "past tense of gehen: went"

### ✅ Kept (Real Translations)
- "das → the"
- "mir → me"
- "eine → a/an (feminine)"
- "ging → went"
- "schnell → fast"

---

## Expected Results

### Before Filtering
```
Total words: 171,508
Contains: grammatical descriptions mixed with real translations
```

### After Filtering
```
Total words: 142,567
Skipped (grammatical): 28,941
Contains: only real, learnable translations
```

---

## Quick Tests

### AWS PostgreSQL
```bash
psql -h YOUR_RDS_ENDPOINT -U postgres -d wordmaster -c \
  "SELECT word, translation FROM words WHERE translation ILIKE '%form of%' LIMIT 5;"
```
**Should return**: 0 rows

### Mobile SQLite
```bash
sqlite3 WordMasterApp/wordmaster.db \
  "SELECT word, translation FROM words WHERE translation LIKE '%form of%' LIMIT 5;"
```
**Should return**: 0 rows

---

## Files Modified

### Backend (AWS)
- ✅ `backend/src/scripts/seedWords.js` - Filters during import
- ✅ `backend/src/scripts/cleanGrammaticalEntries.js` - Cleanup script

### Mobile App
- ✅ `WordMasterApp/scripts/createCorrectDatabase.js` - Filters during import
- ✅ `WordMasterApp/scripts/cleanGrammaticalEntries.js` - Cleanup script
- ✅ `WordMasterApp/src/utils/distractorGenerator.js` - Filters during runtime
- ✅ `WordMasterApp/src/services/database.js` - Filters during queries

---

## Troubleshooting

### "Can't connect to database"
```bash
# Check your .env file
cat backend/.env | grep DB_

# Test connection
psql -h YOUR_RDS_ENDPOINT -U postgres -d wordmaster -c "SELECT 1;"
```

### "Still seeing grammatical entries"
```bash
# Make sure you ran the cleanup
node src/scripts/cleanGrammaticalEntries.js

# Then re-test in app
```

### "Not enough words after filtering"
This is expected - you're removing ~17% of entries that weren't learnable anyway. The remaining words are higher quality.

---

## Need More Help?

See detailed documentation:
- `AWS_VOCABULARY_SETUP.md` - AWS-specific setup guide
- `VOCABULARY_FILTERING.md` - Complete filtering documentation
- `AWS_DEPLOYMENT_GUIDE.md` - Full AWS deployment guide
