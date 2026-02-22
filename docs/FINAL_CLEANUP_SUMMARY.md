# Vocabulary Cleanup: Grammatical Entry Removal

**Date**: Session update
**Scope**: All JSON data files, backend seeder, API layer, mobile app fallback

## Problem

The Wiktionary-sourced dictionary data contained grammatical descriptions instead of plain word translations. Examples of bad entries that appeared in the app:

```
das -> nominative/accusative neuter singular of der: the
mir -> dative of ich: me/to me
ist -> third-person singular present of sein
hogy -> how?/(interrogative) how?
azt -> accusative singular of az
ça  -> that/(informal) that (distal demonstrative pronoun)
```

## Solution: Four-layer defense

The fix addresses this at every stage of the data pipeline, preventing grammatical entries from reaching users now and in the future when new languages are added.

**Layer 1 -- Source data generation** (`parseKaikkiDictionary.js`): Wiktionary glosses matching grammatical patterns are rejected before they enter any JSON file. This is the only layer needed for new languages.

**Layer 2 -- JSON data files** (cleaned by `cleanJsonDataFiles.js`): All existing JSON files were stripped of grammatical entries and salvageable entries had their annotations removed while preserving the core translation. For example, `"I  pronoun)"` was salvaged to `"I"`, and `"what/(interrogative) what"` was deduplicated to `"what"`.

**Layer 3 -- Backend seed/serve** (`seedWords.js` and `words.controller.js`): The seeder validates every entry before inserting into PostgreSQL. The API controller applies SQL-level `NOT ILIKE` conditions to exclude any stray entries from responses.

**Layer 4 -- Mobile app** (`wordApiService.js` and `database.js`): The local fallback importer runs the same validation. The SQLite query layer applies `NOT LIKE` conditions as a final safety net.

## Cleanup Results

| File | Before | After | Removed | Salvaged |
|------|--------|-------|---------|----------|
| words_french.json | 30,000 | 11,871 | 18,129 (60%) | 452 |
| words_german.json | 30,000 | 10,883 | 19,117 (64%) | 421 |
| words_hungarian.json | 30,000 | 6,793 | 23,207 (77%) | 307 |
| words_translated.json (es) | 29,999 | 289 | 29,710 (99%) | 0 |

The reverse-direction files (e.g. `words_french_to_english.json`) mirror the same counts. The Spanish files have only 289 entries because the translation step failed for most words (marked `[TRANSLATE: ...]`), which is a separate data gap to address.

## Patterns Detected and Removed

Grammatical cases (nominative, accusative, dative, genitive, plus 15+ Hungarian-specific cases like inessive, illative, elative, superessive, sublative, delative, adessive, allative, translative, terminative, essive, causal-final, sociative, partitive, comitative). Person markers (first/second/third-person). Tense and mood descriptions (past/present/future tense, participles, imperative, subjunctive, infinitive, conditional, preterite, imperfect). Morphological derivations (inflection of, conjugation of, declension of, form of, contraction of, apocopic/clitic/prevocalic form of, diminutive of, causative of, frequentative of). Gender markers (masculine, feminine, neuter). Metadata entries (initialism, abbreviation, acronym, ISO codes, alphabet descriptions). Placeholder entries (`[TRANSLATE: ...]`, `[NEED: ...]`). Overly long definitions (>80 characters).

## Salvage Examples

Entries that contained a valid translation buried under annotations were cleaned instead of removed:

```
"I  pronoun)"                              -> "I"
"and/(co-ordinating) and"                  -> "and"
"what/(interrogative) what"                -> "what"
"he/(personal) he"                         -> "he"
"one/(cardinal number) one"                -> "one"
"the/Used before abstract nouns"           -> "the"
"that/(informal) that (distal dem...)"     -> "that"
"how?/(interrogative) how?"                -> "how?"
"if )/when"                                -> "if/when"
"I/(personal) I (first-person singular)"   -> "I"
```

## Deploying to AWS

After committing these changes, deploy to the EC2 instance:

```bash
# From the project root
bash backend/src/scripts/deployCleanup.sh
```

This pushes to GitHub, pulls on EC2, runs the database cleanup, re-seeds with clean data, and restarts the backend.

Alternatively, deploy manually by SSH-ing to EC2 and running:

```bash
cd ~/Wordmaster/backend
git pull origin main
npm install --production
node src/scripts/cleanGrammaticalEntries.js --apply
node src/scripts/seedWords.js
pm2 restart wordmaster-api
```

## Adding New Languages

When adding a new language to the project, the `parseKaikkiDictionary.js` script now filters grammatical glosses at parse time. Run it, then run `cleanJsonDataFiles.js` as a second pass to catch any edge cases.

```bash
cd WordMasterApp/scripts
node parseKaikkiDictionary.js --lang=it
node cleanJsonDataFiles.js --apply
```

Then re-seed the backend database with `seedWords.js`.

## Files Modified

```
WordMasterApp/src/data/words_*.json          -- cleaned source data
WordMasterApp/scripts/cleanJsonDataFiles.js  -- JSON data cleaner
WordMasterApp/scripts/verifyCleanData.js     -- verification tool
WordMasterApp/scripts/parseKaikkiDictionary.js -- source-level filtering
WordMasterApp/src/services/wordApiService.js -- app fallback validation
backend/src/scripts/seedWords.js             -- backend seed validation
backend/src/scripts/cleanGrammaticalEntries.js -- AWS DB cleanup
backend/src/scripts/deployCleanup.sh         -- deployment script
backend/src/controllers/words.controller.js  -- API response filtering
```
