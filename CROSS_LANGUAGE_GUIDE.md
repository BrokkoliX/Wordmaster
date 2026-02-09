# 🌍 Cross-Language Pairs - Complete Guide

## Your Question: How to import all cross-language pairs?

Great question! There are **3 main approaches** to create cross-language pairs (Spanish ↔ French, German ↔ Hungarian, etc.):

---

## 📚 Approach 1: Ready-Made Bilingual Dictionaries (BEST)

### ✅ Pros:
- Free, high-quality data
- Already curated by linguists
- Multiple translations per word
- Often includes usage examples

### Available Resources:

#### **1. Wiktionary (What You Already Have!)**
- **Location**: `/Users/robbie/Tab/Projects/Wordmaster/data/kaikki/Spanish.jsonl`
- **Size**: 1.2 GB (huge!)
- **Contains**: Spanish words with translations to MANY languages
- **Format**: JSONL (one JSON object per line)
- **License**: CC BY-SA (free to use)

**Sample Entry:**
```json
{
  "word": "casa",
  "translations": [
    {"lang": "French", "lang_code": "fr", "word": "maison"},
    {"lang": "German", "lang_code": "de", "word": "Haus"},
    {"lang": "Hungarian", "lang_code": "hu", "word": "ház"},
    {"lang": "English", "lang_code": "en", "word": "house"}
  ]
}
```

✨ **This means you can get Spanish → French/German/Hungarian directly!**

#### **2. Kaikki.org - More Languages**
You can download more Wiktionary data:
- French.jsonl (French words with translations)
- German.jsonl (German words with translations)  
- Hungarian.jsonl (Hungarian words with translations)

**Download**: https://kaikki.org/dictionary/downloads.html

#### **3. Other Bilingual Dictionary Sources:**

**FreeDict Project**
- URL: https://freedict.org/
- Format: TEI XML
- Languages: 100+ pairs
- License: GPL (free)

**OPUS Bilingual Dictionaries**
- URL: https://opus.nlpl.eu/
- Format: TMX, Moses
- Languages: 400+ pairs
- Based on parallel corpora
- License: Various (mostly free)

**Tatoeba Translations**
- URL: https://tatoeba.org/en/downloads
- Sentence pairs in 400+ languages
- Can extract single words
- License: CC BY

**JMdict (Japanese), CC-CEDICT (Chinese)**
- Comprehensive Asian language dictionaries
- Free, open source

---

## 🔄 Approach 2: English as Bridge Language

### How it Works:
```
Spanish "casa" → English "house" → French "maison"
German "Haus" → English "house" → Spanish "casa"
```

### ✅ Pros:
- Uses data you already have
- No additional downloads needed
- Works for frequency-aligned words

### ❌ Cons:
- Less accurate (loses nuance)
- Doesn't work with placeholder translations
- May miss context-specific translations

### When to Use:
- Quick prototype
- High-frequency words (top 1000)
- When direct dictionaries unavailable

---

## 🤖 Approach 3: Translation APIs (On-the-Fly)

### Free Options:

#### **LibreTranslate (Open Source, Self-Hosted)**
- URL: https://libretranslate.com/
- Free tier: 5 requests/min
- Can self-host: Unlimited
- Language pairs: 30+
- **Best for**: Self-hosting, privacy

```bash
# Self-host with Docker
docker run -p 5000:5000 libretranslate/libretranslate

# Use API
curl -X POST "http://localhost:5000/translate" \
  -H "Content-Type: application/json" \
  -d '{"q":"casa","source":"es","target":"fr"}'
```

#### **MyMemory Translation API**
- URL: https://mymemory.translated.net/doc/
- Free tier: 5000 requests/day
- No API key needed
- All language pairs
- **Best for**: Quick batch translation

```javascript
// Example
const translate = async (text, from, to) => {
  const url = `https://api.mymemory.translated.net/get?q=${text}&langpair=${from}|${to}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.responseData.translatedText;
};
```

#### **Google Translate (Free Scraping - Not Official)**
- URL: https://github.com/matheuss/google-translate-api
- Free (scrapes Google Translate)
- All language pairs
- **Warning**: Against Google's ToS, may break

#### **DeepL API (Best Quality, Limited Free)**
- URL: https://www.deepl.com/pro-api
- Free tier: 500,000 chars/month
- Best translation quality
- Requires API key
- **Best for**: High-quality translations

### Paid Options (if scaling):
- Google Cloud Translation API ($20 per 1M chars)
- Microsoft Translator ($10 per 1M chars)
- AWS Translate ($15 per 1M chars)

---

## 🎯 RECOMMENDED APPROACH for Your Project

### **Use Wiktionary Data You Already Have!**

Here's why:
1. ✅ You already have Spanish.jsonl (1.2 GB)
2. ✅ It contains Spanish → French/German/Hungarian translations
3. ✅ Free, no API limits
4. ✅ High quality, curated by humans
5. ✅ Offline, fast

### Implementation Steps:

**Step 1**: Parse Wiktionary for cross-language translations
**Step 2**: Match words by frequency rank
**Step 3**: Create bidirectional pairs
**Step 4**: Import to database

---

## 💻 IMPLEMENTATION

I'll create a script that:
1. Reads your Spanish.jsonl file
2. Extracts Spanish → French/German/Hungarian translations
3. Creates cross-language pairs
4. Imports to database

**Estimated time**: 5-10 minutes to run
**Result**: 6,000+ cross-language pairs per language combination

---

## 📊 What You'll Get

### From Spanish.jsonl:
```
Spanish → French: ~10,000+ translations
Spanish → German: ~10,000+ translations  
Spanish → Hungarian: ~5,000+ translations
```

### After downloading more Wiktionary data:
```
French.jsonl → All French translations
German.jsonl → All German translations
Hungarian.jsonl → All Hungarian translations
```

**Total possible**: 50,000+ cross-language pairs

---

## 🚀 Next Steps

### Option A: Use Spanish.jsonl (Quick - 10 min)
1. I'll create a script to parse Spanish.jsonl
2. Extract cross-language translations
3. Import to database
4. **Result**: Spanish ↔ FR/DE/HU working immediately

### Option B: Download All Wiktionary Data (Complete - 30 min)
1. Download French.jsonl, German.jsonl, Hungarian.jsonl
2. Parse all files
3. Create all possible pairs
4. **Result**: ALL cross-language pairs working

### Option C: Use Translation API (Flexible)
1. Choose an API (LibreTranslate recommended)
2. Batch translate top 5,000 words per language
3. Store translations
4. **Result**: High-quality, on-demand translations

---

## 🎓 Technical Details

### Wiktionary JSONL Format:

```json
{
  "word": "casa",
  "pos": "noun",
  "lang": "Spanish",
  "lang_code": "es",
  "senses": [
    {
      "glosses": ["house", "home"],
      "id": "casa-noun-1"
    }
  ],
  "translations": [
    {
      "code": "fr",
      "lang": "French",
      "word": "maison",
      "sense": "house"
    },
    {
      "code": "de", 
      "lang": "German",
      "word": "Haus",
      "sense": "house"
    },
    {
      "code": "hu",
      "lang": "Hungarian", 
      "word": "ház",
      "sense": "house"
    }
  ]
}
```

### Parsing Strategy:

```javascript
// Read Spanish.jsonl line by line
// For each Spanish word in our frequency list:
//   1. Find matching entry in Wiktionary
//   2. Extract translations to FR/DE/HU
//   3. Create word pair in database
//   4. Maintain CEFR level from frequency
```

---

## 📈 Comparison of Approaches

| Approach | Speed | Quality | Coverage | Cost | Offline |
|----------|-------|---------|----------|------|---------|
| **Wiktionary** | Fast | Excellent | High | Free | ✅ Yes |
| **English Bridge** | Very Fast | Good | Medium | Free | ✅ Yes |
| **LibreTranslate** | Medium | Good | High | Free | ✅ Self-host |
| **MyMemory API** | Medium | Good | High | Free tier | ❌ No |
| **DeepL API** | Medium | Excellent | High | Limited free | ❌ No |
| **Google Translate** | Slow | Excellent | High | $$ Paid | ❌ No |

---

## 🎯 My Recommendation

### **Phase 1: Use Wiktionary (NOW)**
- Parse Spanish.jsonl you already have
- Get 10,000+ Spanish ↔ FR/DE/HU pairs
- Free, offline, high quality
- **Time**: 10 minutes to implement

### **Phase 2: Download More Wiktionary (NEXT)**
- Download French/German/Hungarian.jsonl
- Get complete coverage for all pairs
- Still free, offline
- **Time**: 30 minutes to download + parse

### **Phase 3: API for Missing Words (LATER)**
- Use LibreTranslate for words not in Wiktionary
- Self-host for unlimited translations
- Fill gaps
- **Time**: Ongoing as needed

---

## 🔧 What I'll Build for You

### Script: `createCrossLanguagePairs.js`

**Features**:
1. ✅ Parses Spanish.jsonl (Wiktionary data)
2. ✅ Matches your frequency-ranked Spanish words
3. ✅ Extracts translations to French/German/Hungarian
4. ✅ Creates bidirectional pairs
5. ✅ Maintains CEFR levels
6. ✅ Imports to database
7. ✅ Shows statistics

**Result**:
- Spanish ↔ French: ~8,000 pairs
- Spanish ↔ German: ~8,000 pairs
- Spanish ↔ Hungarian: ~5,000 pairs
- **Total**: ~21,000 new cross-language pairs

---

## 📝 Summary

**Your Best Option**: Use the **Wiktionary data you already have**!

**Why**:
- Already downloaded (1.2 GB Spanish.jsonl)
- High quality (human-curated)
- Completely free
- Works offline
- 10,000+ translations available

**Next**:
- I'll create the script to parse it
- Extract cross-language pairs
- Import to your database
- You'll have Spanish ↔ FR/DE/HU working in 10 minutes!

---

**Ready to proceed?** I'll create the Wiktionary parser script now! 🚀
