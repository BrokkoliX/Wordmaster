# Vocabulary: Sources, Filtering, and Import

This document covers the vocabulary data pipeline, the grammatical entry filtering system, and how to import and maintain vocabulary in both the backend (AWS RDS PostgreSQL) and mobile (local SQLite) databases.

---

## The Filtering Problem

Vocabulary data sources (especially German and French) contain entries that are grammatical annotations rather than actual translations. For example, entries like "nominative/accusative neuter singular of der: the" or "inflection of der: accusative masculine singular" are not learnable vocabulary and are impossible to type in exercises.

The system uses multi-layered filtering to remove these entries.

---

## Filtering Implementation

### Import-time filtering

Both `backend/src/scripts/seedWords.js` and `mobile/scripts/createCorrectDatabase.js` apply an `isGrammaticalDescription()` check during import. Entries matching any of the following patterns are skipped: case markers (nominative, accusative, dative, genitive), form indicators (singular of, plural of, inflection of, conjugation of, declension of), gender markers (masculine, feminine, neuter), tense markers (past tense, present tense), comparative forms (comparative of, superlative of), and translations longer than 100 characters.

### Runtime filtering

`mobile/src/constants/sqlFilters.js` exports a reusable `grammaticalFilter()` function that generates SQL `AND` clauses. This is used in `database.js` (for word review and new-word queries) and `distractorGenerator.js` (for distractor selection) to exclude any grammatical entries that survive in the database.

### Cleanup scripts

For databases that already contain grammatical entries:

```bash
# Backend (PostgreSQL) — dry-run by default, pass --apply to delete
cd backend
node src/scripts/cleanGrammaticalEntries.js
node src/scripts/cleanGrammaticalEntries.js --apply

# Mobile (SQLite)
cd mobile/scripts
node cleanGrammaticalEntries.js
```

---

## Importing Vocabulary

### Backend (AWS RDS PostgreSQL)

```bash
# On EC2 or locally with .env pointing to RDS
cd backend
node src/scripts/seedWords.js
```

The script loads JSON files from `mobile/src/data/`, applies grammatical filtering, and inserts in batches using `ON CONFLICT DO NOTHING` so it is safe to re-run.

### Mobile (Local SQLite)

```bash
cd mobile/scripts
node createCorrectDatabase.js
```

### Verifying the import

Connect to PostgreSQL and confirm no grammatical entries remain:

```sql
SELECT COUNT(*) FROM words
WHERE translation ILIKE '%nominative%'
   OR translation ILIKE '%accusative%'
   OR translation ILIKE '%form of%';
```

This should return 0.

---

## Database Maintenance

### Re-importing after vocabulary updates

```bash
ssh -i wordmaster-key.pem ubuntu@<EC2_IP>
cd ~/Wordmaster
git pull origin main
cd backend
node src/scripts/seedWords.js
```

### Backup and restore

```bash
# Backup
pg_dump -h <RDS_ENDPOINT> -U postgres wordmaster > backup_$(date +%Y%m%d).sql

# Restore
psql -h <RDS_ENDPOINT> -U postgres wordmaster < backup_20240213.sql
```

### Index optimization after import

```sql
ANALYZE words;
```

---

## Troubleshooting

**Connection timeout** -- Check that the EC2 security group can reach the RDS instance and that the RDS endpoint in `.env` is correct.

**Out of memory** -- Increase the Node heap:

```bash
NODE_OPTIONS=--max-old-space-size=4096 node src/scripts/seedWords.js
```

**Duplicate key errors** -- Normal and expected. The script uses `ON CONFLICT DO NOTHING`.

**Still seeing grammatical entries** -- Run `cleanGrammaticalEntries.js --apply`, then verify in psql. If new patterns appear, add them to `isGrammaticalDescription()` in `seedWords.js` and to the filter in `mobile/src/constants/sqlFilters.js`.

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/src/scripts/seedWords.js` | Backend import with filtering |
| `backend/src/scripts/cleanGrammaticalEntries.js` | PostgreSQL cleanup script |
| `mobile/scripts/createCorrectDatabase.js` | Mobile import with filtering |
| `mobile/scripts/cleanGrammaticalEntries.js` | SQLite cleanup script |
| `mobile/src/constants/sqlFilters.js` | Shared runtime SQL filter clauses |
| `mobile/src/utils/distractorGenerator.js` | Distractor generation with filtering |
| `mobile/src/services/database.js` | Word queries with filtering |
