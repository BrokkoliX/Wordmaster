# Language Data Strategy: Sources, Pipelines, and Scaling

This document covers how to source, clean, manage, and scale vocabulary data for Wordmaster. It addresses English-based pairs (en-fr, en-de, etc.) and cross-language pairs built around four hub languages: English, French, German, and Portuguese. Each hub pairs with every supported language (e.g., fr-de, fr-es, pt-de, de-hu), but pairs between two non-hub languages (e.g., hu-ru, es-ru) are out of scope. The document also evaluates multi-step pipelines beyond simple dictionary downloads.

---

## Current State

Wordmaster currently supports six languages (es, fr, de, hu, pt, ru), all paired with English. The pipeline is:

1. Download Kaikki.org Wiktionary JSONL dumps (`downloadDictionaries.sh`).
2. Parse JSONL and match against FrequencyWords lists to assign CEFR ranks (`parseKaikkiDictionary.js`).
3. Optionally fill gaps with DeepL or OpenAI (`translateFrequencyWords.js`, `fillTranslationGaps.js`).
4. Cross-language pairs are built by bridging through English (`createBidirectionalPairs.js`, `createCrossLanguagePairs.js`).

The bridge approach has a fundamental limitation: if "house" maps to French "maison" and German "Haus", the fr-de pair maison-Haus is only as accurate as the English pivot. Polysemous words like French "livre" (book or pound) collapse into whichever single English gloss was chosen.

---

## Part 1: Data Sources

### 1.1 Kaikki.org / Wiktionary (current primary source)

Kaikki.org provides machine-readable JSONL extractions of Wiktionary. Each line is a single word-sense entry with fields like `word`, `pos`, `senses[].glosses`, and `translations[]`. The English Wiktionary edition contains translation tables that map a headword in language X to translations in many other languages. This is the richest freely available multilingual dictionary.

Strengths: broad language coverage, part-of-speech tags, IPA pronunciation, etymologies, usage examples. Weaknesses: noisy data, many grammatical-form entries, inconsistent gloss quality across languages.

There are two editions relevant to Wordmaster. The "English Wiktionary" dumps contain entries *about* foreign words with English glosses (what `parseKaikkiDictionary.js` uses). The "foreign-language Wiktionary" dumps (e.g., French Wiktionary) contain entries *about* words in all languages with French definitions. For a fr-de pair, the French Wiktionary's German entries would give direct French definitions of German words without an English pivot.

Kaikki URLs for foreign-edition Wiktionary dumps follow this pattern:

```
https://kaikki.org/dictionary/raw-wiktextract-data.json  (full, all languages)
https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl  (EN Wiktionary, French entries)
```

The foreign-edition Wiktionary data requires a different download. For example, the French Wiktionary edition is at:

```
https://kaikki.org/dictionary/downloads/fr/  (FR Wiktionary data)
```

### 1.2 FrequencyWords (current secondary source)

The [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) repository provides word frequency lists derived from OpenSubtitles data. Each file contains one word per line with a frequency count. The project uses 50k-word files. These lists determine CEFR level assignment.

Strengths: covers 40+ languages, frequency-ranked, free. Weaknesses: sourced from movie subtitles (colloquial bias), no translations, no part-of-speech tags.

### 1.3 OPUS / Tatoeba (new source -- parallel sentences)

[OPUS](https://opus.nlpl.eu/) is a collection of parallel corpora (sentence pairs in two languages). Tatoeba.org is a community-curated database of example sentences with translations. Both provide direct L1-L2 sentence alignments without an English pivot.

For Wordmaster, these serve two purposes. First, word-level bilingual dictionaries can be extracted from aligned sentence pairs using statistical methods (word alignment). Second, sentence-level data feeds directly into the existing `sentences_*.json` files for grammar exercises.

Tatoeba exports are available at `https://tatoeba.org/en/downloads` as tab-separated files. The `sentences_detailed.tsv` and `links.csv` files let you reconstruct any pair.

### 1.4 Wikidata Lexicographic Data

[Wikidata Lexemes](https://www.wikidata.org/wiki/Wikidata:Lexicographical_data) contain structured dictionary entries with senses linked across languages via shared Wikidata sense identifiers. A French lexeme sense and a German lexeme sense pointing to the same Wikidata concept (e.g., Q3947) are translation-equivalent by definition. This is the cleanest source for direct cross-language mappings.

Query the SPARQL endpoint at `https://query.wikidata.org/sparql` to extract pairs. Coverage is growing but incomplete for less-resourced languages.

### 1.5 Translation APIs (DeepL, Google Cloud Translation, OpenAI)

The project already integrates DeepL and OpenAI in `translateFrequencyWords.js`. These are the gap-filling step.

| API | Free Tier | Direct L1-L2 | Quality |
|---|---|---|---|
| DeepL | 500k chars/month | Yes (most EU pairs) | Best for EU languages |
| Google Cloud Translation | $20 free credit, then $20/M chars | Yes (any pair) | Good, supports 130+ languages |
| OpenAI GPT-4o | Pay-per-token | Any pair via prompt | Excellent but expensive at scale |
| LibreTranslate | Self-hosted, free | Limited pairs | Fair |
| Argos Translate | Self-hosted, free | Limited pairs | Fair |

DeepL supports direct fr-de, fr-pt, and most European pairs. Google Cloud Translation supports virtually any pair. Both are preferable to pivoting through English because they produce a single canonical translation rather than the English-bridge lossy mapping.

### 1.6 CLDR / Unicode Common Locale Data

The Unicode CLDR provides localized names for languages, countries, currencies, and calendar terms. It is not a dictionary, but it provides professionally localized interface strings. For Wordmaster, CLDR data could populate thematic vocabulary categories (days of the week, months, country names) with guaranteed correctness in every supported locale.

### 1.7 Open Multilingual Wordnet

[Open Multilingual Wordnet](http://compling.hss.ntu.edu.sg/omw/) links WordNet synsets across languages. A synset like `{dog, domestic dog, Canis familiaris}` in English maps to equivalent synsets in French, German, Hungarian, etc. This gives sense-disambiguated translations (the "bank" by the river vs. the financial "bank" map to different synsets).

---

## Part 2: Multi-Step Pipeline Architecture

Rather than a single "download dictionary" step, a professional pipeline has multiple stages. Each stage can be run independently and re-run when sources update.

### Pipeline Overview

```
Stage 1: ACQUIRE        Stage 2: NORMALIZE       Stage 3: TRANSLATE
 Kaikki JSONL        -->  Deduplicate          -->  Direct API (DeepL/Google)
 FrequencyWords      -->  Filter POS           -->  OR English bridge
 Tatoeba sentences   -->  Assign frequency     -->  OR Wikidata sense links
 Wikidata SPARQL     -->  Assign CEFR          -->
                     -->  Clean glosses         -->

Stage 4: VALIDATE        Stage 5: MERGE           Stage 6: EXPORT
 Human spot-check    -->  Combine all sources  -->  JSON for mobile
 Automated rules     -->  Resolve conflicts    -->  SQL for backend
 Coverage report     -->  Source provenance     -->  Admin review queue
```

### Stage 1: Acquire

Download and cache all raw data. Store downloads in `dictionaries/raw/` with timestamps. This should be idempotent; re-running the script skips files that are already present and up to date.

```
dictionaries/
  raw/
    kaikki-en-french.jsonl          # EN Wiktionary, French entries
    kaikki-fr-german.jsonl          # FR Wiktionary, German entries (direct fr-de)
    kaikki-en-german.jsonl
    kaikki-en-hungarian.jsonl
    frequency-fr-50k.txt
    frequency-de-50k.txt
    tatoeba-fr-de.tsv               # Direct sentence pairs
    wikidata-fr-de-lexemes.json     # SPARQL export
```

### Stage 2: Normalize

Parse each raw source into a common intermediate format. The existing `parseKaikkiDictionary.js` does this for Kaikki data. The intermediate format should be one JSON file per language pair per source.

```json
{
  "source": "kaikki-en",
  "pair": "fr-en",
  "generated": "2025-01-15T12:00:00Z",
  "entries": [
    {
      "headword": "maison",
      "translation": "house",
      "pos": "noun",
      "frequency_rank": 142,
      "cefr": "A1",
      "confidence": 0.95,
      "ipa": "/mɛ.zɔ̃/",
      "example_sentence": "La maison est grande.",
      "source_id": "kaikki-en:maison:noun:1"
    }
  ]
}
```

Key normalization steps:

1. **Deduplicate**: Kaikki has separate entries for every sense of a word. Collapse entries that share the same `(headword, pos)` pair. Keep distinct translations as alternatives rather than discarding them.

2. **Filter grammatical forms**: The existing `GRAMMATICAL_GLOSS_PATTERNS` regex list in `parseKaikkiDictionary.js` is a good start. Extend it to also filter entries whose `pos` is `"suffix"`, `"prefix"`, `"infix"`, or `"affix"`, and entries whose headword contains spaces (multi-word expressions at scale are noisy).

3. **Assign frequency rank**: Match against FrequencyWords. Words not in the frequency list can still be included but should receive a synthetic rank (e.g., 50001+) and be assigned C2.

4. **Assign CEFR**: Use the existing `CEFR_LEVELS` mapping from frequency rank.

5. **Clean glosses**: Beyond the grammatical filter, strip Wiktionary markup artifacts like `{{lb|fr|...}}`, remove "Synonym of X" entries, and collapse near-duplicate translations (e.g., "house" and "House" should merge).

### Stage 3: Translate (for cross-language pairs)

Three strategies exist for building a pair like fr-de.

**Strategy A -- Direct dictionary lookup (best quality, limited coverage):**

Use the French Wiktionary dump. French Wiktionary contains entries for German words with French-language definitions. Parse these entries the same way `parseKaikkiDictionary.js` parses English glosses, but look for French glosses instead.

The English Wiktionary's `translations[]` field also contains direct fr-de mappings. When a word like "house" has both `{code: "fr", word: "maison"}` and `{code: "de", word: "Haus"}` in its translations array, you can pair them directly. This is what `createCrossLanguagePairs.js` does for Spanish, but only for three target languages. Generalize it to emit pairs for all language combinations.

**Strategy B -- Translation API (best quality at scale, costs money):**

Send the frequency-ranked word list for language A to DeepL or Google Translate, requesting translation into language B directly (not via English). DeepL supports fr-de natively.

```bash
# Example: translate top 5000 French words to German
node scripts/translateFrequencyWords.js --source=fr --target=de --api=deepl --limit=5000
```

The existing `translateFrequencyWords.js` hardcodes `targetLang = 'EN'`. Modify it to accept a `--target` flag.

Cost estimate for DeepL free tier: the top 5,000 words average about 6 characters each, so 30,000 characters per language pair. You can produce about 16 language pairs per month within the free 500k-character limit.

**Strategy C -- English bridge (current approach, lossy):**

Use existing en-X and en-Y data to find words with matching English translations. This is what `createBidirectionalPairs.js` does. It should be treated as a fallback when strategies A and B produce no result.

The recommended composite approach: start with strategy A (free, high quality), fill gaps with strategy B (API), and use strategy C only as a last resort. Record which strategy produced each entry in a `source` field so you can prioritize upgrades later.

### Stage 4: Validate

Automated validation catches common data problems before they reach users.

1. **Self-referential check**: reject entries where `headword === translation` (the word was "translated" to itself).
2. **Length ratio check**: if a single word maps to a 10-word phrase, flag it for review.
3. **Script check**: a French word should contain only Latin-script characters; a Russian word should contain only Cyrillic. Entries violating this are likely parsing errors.
4. **Duplicate pair check**: ensure no two entries have the same `(headword, target_lang)` combination.
5. **Coverage report**: for each language pair, report counts per CEFR level. A pair with zero A1 words is broken.

### Stage 5: Merge

When multiple sources provide a translation for the same word, pick the best one. A priority order:

1. Human-reviewed (admin panel edits) -- highest trust.
2. Translation API (DeepL/Google) -- high trust.
3. Wikidata lexeme links -- high trust, sense-disambiguated.
4. Direct foreign-Wiktionary gloss -- medium-high trust.
5. English-Wiktionary translation table cross-reference -- medium trust.
6. English bridge -- lowest trust.

Store the source provenance on each entry so the admin panel can display it and moderators can prioritize review.

### Stage 6: Export

Generate the final output files consumed by the mobile app and backend. The current export format (JSON arrays in `mobile/src/data/`) works fine. The export step should also generate SQL insert statements for the backend seeder.

---

## Part 3: Managing Cross-Language Pairs

### Hub-Language Model

Building every possible pair between N languages is unnecessary. Most learners study from or toward a major language they already know. Wordmaster uses four hub languages -- English, French, German, and Portuguese -- each paired with every supported language. Pairs between two non-hub languages (e.g., Hungarian-Russian, Spanish-Russian) are excluded.

The current six supported languages (es, fr, de, hu, pt, ru) produce the following target pairs. Each row is bidirectional, so "en-fr" means both en->fr and fr->en.

**English hub** (already done):

```
en-es  en-fr  en-de  en-hu  en-pt  en-ru
```

**French hub** (new):

```
fr-es  fr-de  fr-hu  fr-pt  fr-ru
```

**German hub** (new):

```
de-es  de-fr  de-hu  de-pt  de-ru
```

**Portuguese hub** (new):

```
pt-es  pt-fr  pt-de  pt-hu  pt-ru
```

After deduplication (fr-de and de-fr are the same undirected pair), this gives 6 (en) + 5 (fr) + 4 (de, minus de-fr already counted under French hub) + 3 (pt, minus pt-fr and pt-de already counted) = 18 undirected pairs, or 36 directed pairs. Adding a seventh language (e.g., Italian) adds at most 4 new undirected pairs (one per hub) rather than 12 in a full mesh.

### Recommended Data Model Changes

The current `words` table schema is already pair-agnostic (`source_lang`, `target_lang` columns). No schema change is needed. However, adding a `data_source` column would help track provenance.

```sql
ALTER TABLE words ADD COLUMN data_source VARCHAR(50) DEFAULT 'kaikki';
-- Values: 'kaikki', 'deepl', 'openai', 'wikidata', 'bridge', 'manual'
```

### Generalized Pipeline Script

Replace the per-language scripts with a single configurable pipeline. A config file defines all hub pairs and their preferred data strategies.

```json
{
  "hubs": ["en", "fr", "de", "pt"],
  "languages": ["en", "es", "fr", "de", "hu", "pt", "ru"],
  "pairs": [
    {"source": "en", "target": "es", "strategies": ["kaikki-en", "deepl"]},
    {"source": "en", "target": "fr", "strategies": ["kaikki-en", "deepl"]},
    {"source": "en", "target": "de", "strategies": ["kaikki-en", "deepl"]},
    {"source": "en", "target": "hu", "strategies": ["kaikki-en", "deepl"]},
    {"source": "en", "target": "pt", "strategies": ["kaikki-en", "deepl"]},
    {"source": "en", "target": "ru", "strategies": ["kaikki-en", "deepl"]},

    {"source": "fr", "target": "es", "strategies": ["kaikki-fr", "deepl", "bridge"]},
    {"source": "fr", "target": "de", "strategies": ["kaikki-fr", "deepl", "bridge"]},
    {"source": "fr", "target": "hu", "strategies": ["deepl", "bridge"]},
    {"source": "fr", "target": "pt", "strategies": ["kaikki-fr", "deepl", "bridge"]},
    {"source": "fr", "target": "ru", "strategies": ["deepl", "bridge"]},

    {"source": "de", "target": "es", "strategies": ["kaikki-de", "deepl", "bridge"]},
    {"source": "de", "target": "hu", "strategies": ["deepl", "bridge"]},
    {"source": "de", "target": "pt", "strategies": ["deepl", "bridge"]},
    {"source": "de", "target": "ru", "strategies": ["deepl", "bridge"]},

    {"source": "pt", "target": "es", "strategies": ["kaikki-pt", "deepl", "bridge"]},
    {"source": "pt", "target": "hu", "strategies": ["deepl", "bridge"]},
    {"source": "pt", "target": "ru", "strategies": ["deepl", "bridge"]}
  ],
  "defaults": {
    "wordLimit": 10000,
    "cefrLevels": ["A1", "A2", "B1", "B2", "C1", "C2"]
  }
}
```

A single script reads this config and executes the appropriate strategy chain for each pair. Reverse directions (e.g., es->fr from the fr->es pair) are generated automatically by swapping `source_word` and `target_word`.

### File Naming Convention

Adopt a consistent pattern. The current naming (`words_french.json`, `words_french_to_english.json`) does not scale to arbitrary pairs.

```
words_{source}_{target}.json
```

***Examples:***

```
words_en_fr.json       # English -> French
words_fr_en.json       # French -> English
words_fr_de.json       # French -> German
words_pt_es.json       # Portuguese -> Spanish
```

---

## Part 4: Source Comparison Matrix

| Source | Direct L1-L2 | Free | Coverage | Quality | CEFR | POS | IPA | Examples |
|---|---|---|---|---|---|---|---|---|
| Kaikki/Wiktionary (EN edition) | No (L-EN only) | Yes | Excellent | Good (needs cleaning) | Via frequency | Yes | Yes | Some |
| Kaikki/Wiktionary (FR/DE/etc edition) | Yes | Yes | Varies by edition | Good | Via frequency | Yes | Yes | Some |
| FrequencyWords | N/A (no translations) | Yes | 40+ langs | Good | Source of CEFR | No | No | No |
| Tatoeba | Yes (sentence-level) | Yes | 300+ langs | Community-curated | No | No | No | Yes (is examples) |
| Wikidata Lexemes | Yes | Yes | Growing | Excellent (structured) | No | Yes | Some | No |
| DeepL API | Yes (EU pairs) | 500k chars/mo | 30+ langs | Excellent | No | No | No | No |
| Google Translate API | Yes (any pair) | $20 free | 130+ langs | Good | No | No | No | No |
| OpenAI GPT-4o | Yes (any pair) | No | Any lang | Excellent | No | On request | On request | On request |
| Open Multilingual Wordnet | Yes | Yes | ~30 langs | Good (sense-linked) | No | Yes | No | Some |
| CLDR | N/A (not a dictionary) | Yes | 100+ locales | Perfect (official) | N/A | N/A | N/A | N/A |

---

## Part 5: Practical Recommendations for Wordmaster

### For English-based pairs (en-X)

The current pipeline (Kaikki + FrequencyWords + API gap-fill) is solid. Improvements:

1. Add IPA pronunciation data from Kaikki entries. The `sounds[].ipa` field is already in the JSONL data but not extracted by `parseKaikkiDictionary.js`. Store it in a new column and display it alongside TTS.

2. Add example sentences from Tatoeba. Download the Tatoeba sentence pairs for each supported language and store them alongside word entries. The app already has `sentences_*.json` files; populate them from Tatoeba rather than hand-curating.

3. Add Wikidata lexeme lookups as a second validation source. If Kaikki says "maison" = "house" and Wikidata confirms that the French lexeme "maison" links to the same concept as the English lexeme "house", the translation is validated.

### For cross-language pairs (hub model)

Only four hub languages generate cross-language pairs: English (already done), French, German, and Portuguese. Each hub pairs with every supported language, but pairs between two non-hub languages (e.g., hu-ru, es-ru) are not produced.

**Tier 1 -- build first** (highest learner demand, best source data):

```
fr-de   fr-es   fr-pt   de-es   pt-es
```

These five pairs cover the most common European study combinations. All have strong Kaikki coverage and native DeepL support.

**Tier 2 -- build second** (good demand, sparser source data):

```
fr-ru   de-ru   pt-ru   de-pt   fr-hu   de-hu   pt-hu
```

Russian and Hungarian have thinner Wiktionary translation tables, so these pairs rely more on DeepL and OpenAI gap-filling.

**Primary strategy**: use the English Wiktionary translation tables. The existing `createCrossLanguagePairs.js` already does this for Spanish. Generalize it to work with any pair by iterating all translation tables in the English Wiktionary dump and extracting entries where both target language codes are present.

**Gap fill**: use DeepL's direct pair support. DeepL handles fr-de, fr-pt, de-es, and most European pairs natively. For pairs involving Hungarian or Russian where Kaikki and DeepL leave gaps, use OpenAI.

**Excluded pairs**: combinations like hu-ru, hu-es, es-ru where neither side is a hub language. If demand for any of these appears later, promote one side to hub status rather than adding ad-hoc pairs.

### Reducing script sprawl

The `mobile/scripts/` directory has 28 scripts with significant duplication. Consolidate into a modular pipeline:

```
scripts/
  pipeline/
    acquire.js        # Download all raw sources
    normalize.js      # Parse raw data into intermediate format
    translate.js      # Fill gaps via API (DeepL/OpenAI/Google)
    validate.js       # Run quality checks
    merge.js          # Combine sources, resolve conflicts
    export.js         # Generate JSON/SQL output files
  config/
    pairs.json        # Language pair definitions
    sources.json      # Source URLs and download paths
    cefr.json         # Frequency-to-CEFR mapping
  legacy/             # Move old scripts here for reference
```

Each script reads from `config/` and operates on a standardized intermediate format. This eliminates the per-language duplication in the current `LANGUAGES` objects.

### Admin panel integration

The admin panel (`admin/src/components/WordImport.jsx`) should show data provenance. When reviewing imported words, moderators should see whether each entry came from Kaikki, DeepL, OpenAI, or the English bridge. Entries from the bridge strategy should be flagged for priority review.

Add a "Data Quality" dashboard card showing coverage percentage per pair per CEFR level, and highlighting pairs with low coverage.

---

## Part 6: Step-by-Step Implementation Plan

### Phase 1: Improve existing en-X pairs (1-2 days)

1. Extract IPA from Kaikki entries in `parseKaikkiDictionary.js`.
2. Download Tatoeba sentence pairs for es, fr, de, hu, pt, ru.
3. Write a `importTatoebaSentences.js` script that populates `sentences_*.json`.
4. Add a `data_source` column to the `words` table.

### Phase 2: Tier 1 hub pairs (2-3 days)

Build the five highest-demand cross-language pairs: fr-de, fr-es, fr-pt, de-es, pt-es.

1. Refactor `createCrossLanguagePairs.js` into a generic script that accepts `--source=fr --target=de`.
2. Parse the English Wiktionary dump once, extract all translation-table cross-references, and write per-pair intermediate files.
3. Modify `translateFrequencyWords.js` to accept a `--target` flag for non-English targets and use DeepL's direct pair support.
4. Run the pipeline for each Tier 1 pair, generating bidirectional JSON files.

### Phase 3: Tier 2 hub pairs and unified pipeline (3-5 days)

Build remaining hub pairs (fr-ru, de-ru, pt-ru, de-pt, fr-hu, de-hu, pt-hu) and consolidate scripts.

1. Create `scripts/pipeline/` with the six stages described in Part 2.
2. Create `scripts/config/pairs.json` with all 18 undirected hub pairs and their strategies.
3. Migrate existing scripts' logic into the new pipeline modules.
4. Add validation and coverage reporting.
5. Run Tier 2 pairs, which rely more heavily on DeepL and OpenAI due to sparser Wiktionary coverage.

### Phase 4: Scale to new languages (ongoing)

To add a new language (e.g., Italian), add it to `pairs.json` with one entry per hub (en-it, fr-it, de-it, pt-it) and run the pipeline. The four hub pairs are generated automatically. No hu-it or ru-it pair is needed because neither Hungarian nor Russian is a hub. If Italian later becomes popular enough to warrant its own hub status, promote it by adding it-X entries for all supported languages.

---

## Appendix A: Useful Download URLs

Kaikki.org Wiktionary dumps (English edition, per-language entries):

```
https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl
https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl
https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl
https://kaikki.org/dictionary/Hungarian/kaikki.org-dictionary-Hungarian.jsonl
https://kaikki.org/dictionary/Portuguese/kaikki.org-dictionary-Portuguese.jsonl
https://kaikki.org/dictionary/Russian/kaikki.org-dictionary-Russian.jsonl
https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl
https://kaikki.org/dictionary/Japanese/kaikki.org-dictionary-Japanese.jsonl
```

FrequencyWords:

```
https://github.com/hermitdave/FrequencyWords (clone the repo)
```

Tatoeba downloads:

```
https://tatoeba.org/en/downloads
https://downloads.tatoeba.org/exports/sentences_detailed.tar.bz2
https://downloads.tatoeba.org/exports/links.tar.bz2
```

Wikidata Lexemes SPARQL example (French-German noun pairs):

```sparql
SELECT ?frLemma ?deLemma WHERE {
  ?frLexeme dct:language wd:Q150 ;       # French
            wikibase:lemma ?frLemma ;
            ontolex:sense ?sense .
  ?deLexeme dct:language wd:Q188 ;       # German
            wikibase:lemma ?deLemma ;
            ontolex:sense ?deSense .
  ?sense wdt:P5137 ?concept .
  ?deSense wdt:P5137 ?concept .
}
LIMIT 10000
```

DeepL supported language pairs:

```
https://developers.deepl.com/docs/resources/supported-languages
```

## Appendix B: Schema Extension Proposal

```sql
-- Add provenance tracking to the words table
ALTER TABLE words ADD COLUMN data_source VARCHAR(50) DEFAULT 'kaikki';
ALTER TABLE words ADD COLUMN confidence REAL DEFAULT 1.0;
ALTER TABLE words ADD COLUMN ipa VARCHAR(100);
ALTER TABLE words ADD COLUMN example_sentence TEXT;
ALTER TABLE words ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE words ADD COLUMN reviewed_by INTEGER REFERENCES users(id);

-- Index for admin review queue
CREATE INDEX idx_words_source ON words(data_source);
CREATE INDEX idx_words_reviewed ON words(reviewed_at);
```

These columns are all nullable and backwards-compatible. Existing data continues to work without changes.
