# Mobile Scripts

Data pipeline and maintenance scripts for the Wordmaster mobile app.

## Active Scripts

| Script | Purpose |
|--------|---------|
| `cleanGrammaticalEntries.js` | Remove grammatical description entries from the local SQLite database. |
| `createCorrectDatabase.js` | Import words into SQLite while filtering out grammatical entries. |
| `createBidirectionalPairs.js` | Generate reverse language-pair JSON files (e.g., Spanish-to-English from English-to-Spanish). |
| `createCrossLanguagePairs.js` | Generate cross-language pair JSON files between non-English hub languages. |
| `exportLanguagesToJSON.js` | Export word data from the database to bundled JSON files. |
| `generateVocabularyPacks.js` | Build curated vocabulary packs by category and CEFR level. |
| `importAllLanguagesToApp.js` | Batch-import all supported language-pair JSON files into the local database. |
| `importLanguages.js` | Import a single language pair into the local database. |
| `parseKaikkiDictionary.js` | Parse Wiktionary/Kaikki dictionary dumps into the Wordmaster word format. |
| `uploadToAWS.js` | Upload bundled JSON data to the AWS backend for serving via the API. |
| `verifyCleanData.js` | Verify that the database contains no grammatical description entries. |
| `testAchievements.js` | Manual test harness for the achievement system (not an automated test). |

## Pipeline Directory

The `pipeline/` subdirectory contains the modular data pipeline steps. See the files inside for details: `acquire.js`, `normalize.js`, `validate.js`, `load.js`, `export.js`.

## Archived Scripts

Legacy and one-off scripts that are no longer actively used live in `_archive/`. They were superseded by the backend API sync or the pipeline scripts above.
