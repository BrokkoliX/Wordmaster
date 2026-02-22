# AWS Database Vocabulary Setup & Filtering

This guide covers setting up and maintaining the vocabulary database on AWS RDS PostgreSQL with grammatical description filtering.

## Prerequisites

- AWS RDS PostgreSQL instance running (see `AWS_DEPLOYMENT_GUIDE.md`)
- Backend `.env` file configured with RDS credentials
- SSH access to EC2 instance (if running scripts remotely)

## Quick Start

### Option 1: Import Clean Data (Recommended)

Import vocabulary with filtering applied automatically:

```bash
# On your local machine or EC2 instance
cd backend

# Make sure .env is configured
cat .env  # Verify DB_HOST, DB_USER, DB_PASSWORD

# Import words (filters grammatical entries automatically)
node src/scripts/seedWords.js
```

**Expected Output**:
```
📥 Loading words_german.json...
   45000 words found
   ✅ Imported 35,420, skipped 120, grammatical 9,460
   
📥 Loading words_french.json...
   38000 words found
   ✅ Imported 32,110, skipped 85, grammatical 5,805

✅ Seed complete.
   Imported: 142,567
   Skipped (empty/invalid): 458
   Skipped (grammatical): 28,941
   Total words in database: 142,567
```

### Option 2: Clean Existing Database

If you already have data with grammatical entries:

```bash
cd backend

# Remove grammatical entries from existing database
node src/scripts/cleanGrammaticalEntries.js
```

**Expected Output**:
```
🧹 Cleaning grammatical description entries from database...

📊 Total words before cleaning: 171,508
🗑️  Removed 28,941 grammatical entries
📊 Total words after cleaning: 142,567

📝 Sample words after cleaning (first 10):
  1. el → the (es, A1)
  2. de → of (es, A1)
  3. que → that (es, A1)
  ...

✅ Database cleaned successfully!
```

## Running Scripts on AWS EC2

### SSH into Your EC2 Instance

```bash
# From your local machine
ssh -i wordmaster-key.pem ubuntu@YOUR_EC2_IP

# Navigate to backend
cd ~/Wordmaster/backend
```

### Run Import Script

```bash
# On EC2 instance
node src/scripts/seedWords.js
```

### Run Cleanup Script

```bash
# On EC2 instance
node src/scripts/cleanGrammaticalEntries.js
```

## Verifying the Database

### Connect to RDS from EC2

```bash
# SSH to EC2 first
ssh -i wordmaster-key.pem ubuntu@YOUR_EC2_IP

# Get database endpoint from environment
cat ~/Wordmaster/backend/.env | grep DB_HOST

# Connect with psql
psql -h YOUR_RDS_ENDPOINT -U postgres -d wordmaster
```

### Check for Grammatical Entries

```sql
-- Should return 0 if filtering worked
SELECT COUNT(*) FROM words 
WHERE translation ILIKE '%nominative%'
   OR translation ILIKE '%accusative%'
   OR translation ILIKE '%form of%';

-- View sample translations
SELECT word, translation, target_lang 
FROM words 
LIMIT 20;

-- Check words by language
SELECT target_lang, COUNT(*) as count
FROM words
GROUP BY target_lang
ORDER BY count DESC;
```

### Expected Results

After filtering, you should see:
- **No entries** with grammatical terminology
- **Shorter translations** (under 100 characters)
- **Actual word translations** not linguistic descriptions

**Examples of what you WILL see** (good):
```
el → the
casa → house
comer → to eat
schnell → fast
```

**Examples of what you WON'T see** (filtered out):
```
das → nominative/accusative neuter singular of der: the
mir → dative of ich: me/to me
eine → feminine nominative/accusative singular of ein
```

## Environment Configuration

### Backend .env File

Ensure your `backend/.env` has these settings:

```env
# Database Configuration (AWS RDS)
DB_HOST=wordmaster-db.abc123.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=wordmaster
DB_USER=postgres
DB_PASSWORD=YourSecurePassword123!

# Other settings...
NODE_ENV=production
PORT=3000
```

### Security Group Check

Make sure your EC2 instance can reach RDS:

```bash
# Test connection from EC2
psql -h YOUR_RDS_ENDPOINT -U postgres -d wordmaster -c "SELECT 1;"

# Should return: 
#  ?column? 
# ----------
#         1
```

If connection fails, check:
1. RDS security group allows EC2 security group
2. RDS is in the same VPC as EC2
3. DB credentials are correct

## Maintenance

### Re-importing Words

If you update the vocabulary JSON files:

```bash
# SSH to EC2
ssh -i wordmaster-key.pem ubuntu@YOUR_EC2_IP

# Pull latest code
cd ~/Wordmaster
git pull origin main

# Navigate to backend
cd backend

# Re-import (uses ON CONFLICT DO NOTHING, so safe to re-run)
node src/scripts/seedWords.js
```

### Partial Updates

To update only specific languages:

Edit `backend/src/scripts/seedWords.js`:

```javascript
const LANGUAGE_FILES = [
  'words_german.json',  // Only import German
  // Comment out others
  // 'words_french.json',
  // 'words_spanish_to_english.json',
];
```

Then run:
```bash
node src/scripts/seedWords.js
```

### Database Backup

Before major changes, backup your database:

```bash
# On EC2 instance
pg_dump -h YOUR_RDS_ENDPOINT -U postgres wordmaster > backup_$(date +%Y%m%d).sql

# Download to local machine
scp -i wordmaster-key.pem ubuntu@YOUR_EC2_IP:~/backup_*.sql .
```

### Restore from Backup

```bash
# On EC2 instance
psql -h YOUR_RDS_ENDPOINT -U postgres wordmaster < backup_20240213.sql
```

## Monitoring & Logs

### Check Import Progress

While scripts are running:

```bash
# In another terminal, watch the database grow
watch -n 5 'psql -h YOUR_RDS_ENDPOINT -U postgres -d wordmaster -c "SELECT COUNT(*) FROM words;"'
```

### View Script Output

Scripts provide detailed logging:
- Number of words processed per file
- Number of words imported
- Number skipped (empty/invalid)
- Number skipped (grammatical)

Save the output for reference:
```bash
node src/scripts/seedWords.js | tee import_log_$(date +%Y%m%d).txt
```

## Troubleshooting

### Connection Timeout

```
Error: connect ETIMEDOUT
```

**Solutions**:
1. Check RDS security group allows EC2
2. Verify RDS endpoint is correct
3. Ensure RDS is running (not stopped)

### Out of Memory

```
JavaScript heap out of memory
```

**Solutions**:
```bash
# Increase Node.js memory
NODE_OPTIONS=--max-old-space-size=4096 node src/scripts/seedWords.js
```

### Duplicate Key Errors

```
Error: duplicate key value violates unique constraint
```

**This is normal** - The script uses `ON CONFLICT DO NOTHING`, so duplicates are safely skipped.

### No Words Imported

**Check**:
1. JSON files exist in `WordMasterApp/src/data/`
2. File paths in script are correct
3. JSON files are valid (not corrupted)

```bash
# Verify JSON files
ls -lh ~/Wordmaster/WordMasterApp/src/data/*.json
```

## Performance Tips

### Batch Import

For very large datasets:
```javascript
// In seedWords.js, increase batch size
const BATCH_SIZE = 1000;  // Default is 500
```

### Index Management

After import, ensure indexes are optimized:

```sql
-- Analyze tables for query optimization
ANALYZE words;

-- Check index usage
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'words';
```

## Cost Optimization

### RDS Instance Sizing

For vocabulary-only database:
- **db.t3.micro** (20GB): Good for development/testing
- **db.t3.small** (20GB): Better for production
- **Scale up** if you add more features (user-generated content, etc.)

### Backup Strategy

Configure automated backups:
```bash
# Set backup retention (AWS CLI)
aws rds modify-db-instance \
  --db-instance-identifier wordmaster-db \
  --backup-retention-period 7
```

### Stop/Start for Development

If not in production:
```bash
# Stop database to save costs
aws rds stop-db-instance --db-instance-identifier wordmaster-db

# Start when needed
aws rds start-db-instance --db-instance-identifier wordmaster-db
```

## Next Steps

After successful import:

1. **Test the backend API** (if you have word endpoints)
2. **Update mobile app** to fetch from backend (if implementing server sync)
3. **Monitor database size** and performance
4. **Setup automated backups** for production

## Related Documentation

- `AWS_DEPLOYMENT_GUIDE.md` - Full AWS setup instructions
- `VOCABULARY_FILTERING.md` - Detailed filtering documentation
- `backend/src/scripts/seedWords.js` - Import script source code
- `backend/src/scripts/cleanGrammaticalEntries.js` - Cleanup script source code
