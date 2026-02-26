# Adding Languages and Language Pairs

This guide covers every file that must be updated when adding a new language or language pair to Wordmaster. The language list is hardcoded in multiple locations across the mobile app, backend, and admin panel.

## Overview of Touchpoints

| File | What to change |
|---|---|
| `mobile/scripts/translateFrequencyWords.js` | `LANGUAGES` object (~line 35) |
| `mobile/src/data/` | Place generated JSON files here |
| `mobile/src/screens/SettingsScreen.js` | `LANGUAGES` array (~line 27) |
| `mobile/src/services/wordApiService.js` | Bundled JSON imports + `getLocalDataForPair` map (~line 68) |
| `mobile/scripts/exportLanguagesToJSON.js` | `LANGUAGE_PAIRS` array (~line 12) |
| `backend/src/scripts/seedWords.js` | `LANGUAGE_FILES` array (~line 22) |
| `admin/src/components/WordImport.jsx` | `LANGUAGES` array (~line 21) |

Cross-language pair scripts (optional):

| File | What to change |
|---|---|
| `mobile/scripts/createBidirectionalPairs.js` | `languages` array and `languageNames` map |
| `mobile/scripts/createCrossLanguagePairs.js` | Add new language extraction logic |

---

## Step 1: Prepare Word Data

The project uses frequency word lists from [FrequencyWords](https://github.com/hermitdave/FrequencyWords), translated via the DeepL or OpenAI API. Clone the repo if you haven't already.

```bash
git clone https://github.com/hermitdave/FrequencyWords.git
```

Register the new language in `mobile/scripts/translateFrequencyWords.js` by adding an entry to the `LANGUAGES` object.

***Example (Italian):***

```js
it: {
  name: 'Italian',
  code: 'IT',
  flag: '🇮🇹',
  frequencyFile: '../../../FrequencyWords/content/2018/it/it_50k.txt'
},
```

Then run the translation pipeline. This requires a `DEEPL_API_KEY` or `OPENAI_API_KEY` environment variable.

```bash
cd mobile
node scripts/translateFrequencyWords.js --lang=it --api=deepl
```

The script produces two JSON files in `mobile/src/data/`: one for en-to-target (e.g., `words_italian.json`) and one for target-to-en (e.g., `words_italian_to_english.json`).

---

## Step 2: Update the Backend

### 2a. Register data files for seeding

Add the new filenames to the `LANGUAGE_FILES` array in `backend/src/scripts/seedWords.js`.

```js
const LANGUAGE_FILES = [
  'words_translated.json',
  'words_french.json',
  'words_german.json',
  'words_hungarian.json',
  'words_italian.json',              // NEW
  'words_spanish_to_english.json',
  'words_french_to_english.json',
  'words_german_to_english.json',
  'words_hungarian_to_english.json',
  'words_italian_to_english.json',   // NEW
];
```

Then re-seed the database.

```bash
cd backend
node src/scripts/seedWords.js
```

### 2b. No controller or schema changes needed

The `words` table stores `source_lang` and `target_lang` as free-form strings. The `GET /api/admin/languages` endpoint discovers available pairs dynamically via `GROUP BY source_lang, target_lang`, so new pairs appear automatically after seeding.

---

## Step 3: Update the Mobile App

Three files need changes.

### 3a. Settings screen language picker

Add the new language to the `LANGUAGES` array in `mobile/src/screens/SettingsScreen.js` (~line 27). This controls which languages users can select.

```js
{ code: 'it', name: 'Italian', flag: '🇮🇹' },
```

### 3b. Bundled data fallback

In `mobile/src/services/wordApiService.js`, add imports for the new JSON files at the top of the file and register them in the `getLocalDataForPair` map (~line 68). This allows offline use when the backend API is unreachable.

```js
// Imports (top of file)
import wordsEnToIt from '../data/words_italian.json';
import wordsItToEn from '../data/words_italian_to_english.json';

// Inside getLocalDataForPair map
en_it: wordsEnToIt,
it_en: wordsItToEn,
```

### 3c. Export pipeline

Add entries to the `LANGUAGE_PAIRS` array in `mobile/scripts/exportLanguagesToJSON.js` (~line 12).

```js
{ source: 'en', target: 'it', name: 'Italian', file: 'words_italian.json' },
{ source: 'it', target: 'en', name: 'Italian→English', file: 'words_italian_to_english.json' },
```

---

## Step 4: Update the Admin Panel

Add the new language to the `LANGUAGES` array in `admin/src/components/WordImport.jsx` (~line 21). This enables admins to select it when bulk-importing words.

```js
{ code: 'it', name: 'Italian' },
```

The language list view in `admin/src/resources/languages.jsx` renders pairs dynamically from the API response and requires no changes.

---

## Step 5 (Optional): Cross-Language Pairs

Cross-language pairs (e.g., Spanish to Italian) use English as a bridge language. To enable them, update two scripts.

In `mobile/scripts/createBidirectionalPairs.js`, add the new language code to the `languages` array and its display name to the `languageNames` map.

In `mobile/scripts/createCrossLanguagePairs.js`, add extraction logic for the new language if Wiktionary data is available for direct lookups instead of bridging through English.

---

## Architecture Notes

The `words` table schema is the same across the backend (PostgreSQL) and mobile (SQLite).

```sql
CREATE TABLE words (
  id VARCHAR(100) PRIMARY KEY,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  category VARCHAR(100),
  frequency_rank INTEGER,
  cefr_level VARCHAR(10) NOT NULL,
  source_lang VARCHAR(10) NOT NULL,
  target_lang VARCHAR(10) NOT NULL
);
```

Language pairs are implicit from the data in the `words` table rather than stored in a dedicated languages table. The backend's `addLanguage` admin endpoint (`POST /api/admin/languages`) currently returns a success message without persisting anything; actual activation happens by importing words with the desired `source_lang`/`target_lang` values.

CEFR levels (A1 through C2) are assigned based on frequency rank during the translation step. The mapping is defined in the `CEFR_LEVELS` object in `translateFrequencyWords.js`. Words ranked 1--500 get A1, 501--1500 get A2, and so on up to C2 at ranks 12001--30000.

## Future Improvement

The language list is currently duplicated in six files. A shared `languages.js` config (perhaps in the `shared/` directory) consumed by all layers would eliminate the need to update multiple files when adding a language.
