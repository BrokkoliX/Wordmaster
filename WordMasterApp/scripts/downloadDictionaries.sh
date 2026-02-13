#!/bin/bash

#Download Kaikki.org Wiktionary dictionaries for French, German, and Hungarian
# These are free, high-quality bilingual dictionaries from Wiktionary

DICT_DIR="../../dictionaries"
mkdir -p "$DICT_DIR"

echo "🌍 Downloading Kaikki.org Wiktionary Dictionaries"
echo "=================================================="
echo ""
echo "This will download ~1.5GB of dictionary data (compressed)"
echo "Estimated time: 10-20 minutes depending on connection"
echo ""

# French
echo "📥 Downloading French dictionary (484MB)..."
if [ ! -f "$DICT_DIR/french.jsonl" ]; then
    curl -L "https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl" \
        -o "$DICT_DIR/french.jsonl" \
        --progress-bar
    echo "✅ French downloaded"
else
    echo "✓ French already exists"
fi

# German  
echo ""
echo "📥 Downloading German dictionary (350MB)..."
if [ ! -f "$DICT_DIR/german.jsonl" ]; then
    curl -L "https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl" \
        -o "$DICT_DIR/german.jsonl" \
        --progress-bar
    echo "✅ German downloaded"
else
    echo "✓ German already exists"
fi

# Hungarian
echo ""
echo "📥 Downloading Hungarian dictionary (180MB)..."
if [ ! -f "$DICT_DIR/hungarian.jsonl" ]; then
    curl -L "https://kaikki.org/dictionary/Hungarian/kaikki.org-dictionary-Hungarian.jsonl" \
        -o "$DICT_DIR/hungarian.jsonl" \
        --progress-bar
    echo "✅ Hungarian downloaded"
else
    echo "✓ Hungarian already exists"
fi

echo ""
echo "============================================================"
echo "✅ ALL DICTIONARIES DOWNLOADED"
echo "============================================================"
echo ""
ls -lh "$DICT_DIR"/*.jsonl
echo ""
echo "🎯 Next step: Run the parser to generate translation files"
echo "   node scripts/parseKaikkiDictionary.js --lang=fr"
echo "   node scripts/parseKaikkiDictionary.js --lang=de"
echo "   node scripts/parseKaikkiDictionary.js --lang=hu"
