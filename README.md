# 🎓 WordMaster - Language Learning App

**A professional vocabulary learning app with spaced repetition, CEFR levels, and multi-language support.**

📊 **[Current Status & Roadmap](STATUS_AND_ROADMAP.md)** ← See what's done and what's next!

---

## 🚀 Quick Start

```bash
# Start the app
cd WordMasterApp
npx expo start --ios

# Or use the shortcut script
./START_APP.sh
```

---

## 📊 Current Status

### ✅ Completed Features:
- **6,423 words** (English → Spanish) with CEFR levels (A1-C2)
- **Spaced Repetition** (SM-2 algorithm)
- **Streak Tracking** (daily motivation)
- **CEFR Level System** (A1 beginner → C2 mastery)
- **Settings Screen** (choose language pair and level)
- **Progress Tracking** (statistics, achievements)
- **52 Categories** (organized vocabulary)

### 📈 Word Distribution:
- A1 (Beginner): 308 words
- A2 (Elementary): 464 words
- B1 (Intermediate): 562 words
- B2 (Upper Intermediate): 908 words
- C1 (Advanced): 1,422 words
- C2 (Mastery): 2,759 words

---

## 🏗️ Architecture

### Tech Stack:
- **Frontend:** React Native (Expo)
- **Database:** SQLite (expo-sqlite)
- **Storage:** AsyncStorage (settings)
- **Algorithm:** SM-2 Spaced Repetition

### Key Services:
- `database.js` - SQLite operations, word queries
- `streakService.js` - Daily streak calculations
- `importWords.js` - Vocabulary import (6,423 words)
- `vocabularyDownloader.js` - Future: Download language packs

### Database Schema:
- `words` - Vocabulary with translations, CEFR levels
- `user_word_progress` - Learning progress, SM-2 data
- `user_statistics` - Streaks, overall progress
- `sessions` - Learning session history
- `categories` - 52 themed categories

---

## 📱 Features

### 1. Achievement System
- 🏆 32 achievements across 7 categories
- Unlock celebrations
- Progress milestones
- Learning motivation

### 2. Learning System
- Multiple choice questions
- Spanish → English translation
- Smart distractor generation
- Instant feedback
- Progress tracking

### 3. Spaced Repetition
- SM-2 algorithm
- Confidence levels
- Adaptive scheduling
- Review intervals

### 4. CEFR Levels
- A1-C2 progression
- Frequency-based ordering
- Progressive unlocking
- 6,423 words across all levels

### 5. Streak System
- Daily streak tracking
- Milestone celebrations (7, 30, 100 days)
- Personal best records
- Motivational messages

### 6. Settings
- Language pair selection (currently EN→ES only)
- CEFR level choice
- Visual preferences
- Progress persistence

---

## 🗺️ Roadmap

### Current Phase: MVP (Week 1-2) ✅
- [x] Streak tracking
- [x] 6,423 English-Spanish words
- [x] CEFR level system
- [x] Settings screen

### Next: Week 3-4
- [ ] Achievement system (20+ badges)
- [ ] Word library browser
- [ ] Category filtering
- [ ] Audio pronunciation (TTS)

### Future: Phase 2-3
- [ ] More language pairs (FR, DE, IT, PT)
- [ ] Vocabulary download system
- [ ] Cloud sync (optional)
- [ ] Native speaker audio
- [ ] Image associations
- [ ] Example sentences

---

## 📂 Project Structure

```
WordMasterApp/
├── src/
│   ├── screens/           # UI screens
│   │   ├── HomeScreen.js
│   │   ├── LearningScreen.js
│   │   ├── SummaryScreen.js
│   │   └── SettingsScreen.js
│   ├── services/          # Business logic
│   │   ├── database.js
│   │   ├── streakService.js
│   │   └── importWords.js
│   ├── utils/             # Helpers
│   │   └── distractorGenerator.js
│   └── data/              # Vocabulary files
│       ├── words_translated.json (6,423 words)
│       └── categories.json (52 categories)
├── scripts/               # Build/import scripts
│   ├── createCorrectDatabase.js
│   └── createSmallDataset.js
└── App.js                # Main entry point
```

---

## 🔧 Development

### Prerequisites:
```bash
# Install dependencies
cd WordMasterApp
npm install

# Install Expo CLI globally (optional)
npm install -g expo-cli
```

### Running:
```bash
# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android

# Web (for testing)
npx expo start --web
```

### Database:
```bash
# Check database
sqlite3 WordMasterApp/wordmaster.db "SELECT COUNT(*) FROM words;"

# Import words
cd WordMasterApp/scripts
node createCorrectDatabase.js
```

---

## 📚 Documentation

### Key Documents:
- `ARCHITECTURE_VOCABULARY_STORAGE.md` - Backend/frontend architecture
- `WEEK_1_SUMMARY.md` - Streak feature documentation
- `WEEK_2_PLAN.md` - Vocabulary expansion plan
- `WEEK_3_PLAN.md` - Achievement system design
- `LANGUAGE_PAIR_FIXED.md` - Multi-language support
- `READY_6423_WORDS.md` - Current vocabulary status

### Plans:
- `PHASE_2_PLAN.md` - Overall roadmap
- `SCALABLE_MULTILINGUAL_PLAN.md` - 30K+ words strategy
- `ULTIMATE_MULTILINGUAL_ARCHITECTURE.md` - Any language pair support

---

## 🎯 Key Metrics

### Content:
- **6,423 words** properly translated
- **321 days** of daily practice content
- **52 categories** for organized learning
- **6 CEFR levels** (A1-C2)

### Performance:
- Database queries: < 10ms
- App size: ~20 MB
- Memory usage: < 100 MB
- Works 100% offline

---

## 🐛 Known Issues

1. **Only EN→ES available** - Other language pairs coming soon
2. **SafeAreaView deprecated** - Will migrate to react-native-safe-area-context
3. **No audio yet** - TTS integration planned for Week 4

---

## 🤝 Contributing

### Adding Language Pairs:
1. Get frequency list (30K words)
2. Translate using Wiktionary/API
3. Assign CEFR levels
4. Import to database
5. See `SCALABLE_MULTILINGUAL_PLAN.md`

### Adding Features:
1. Check `PHASE_2_PLAN.md` for roadmap
2. Create feature branch
3. Test thoroughly
4. Submit PR

---

## 📄 License

MIT License - Free to use and modify

---

## 🎉 Credits

- **Frequency Data:** OpenSubtitles corpus
- **Translations:** Wiktionary (CC-BY-SA)
- **Algorithm:** SM-2 (Piotr Wozniak)
- **CEFR Standards:** Common European Framework

---

## 📞 Support

For issues or questions:
1. Check documentation in `/docs`
2. Review `QUICK_START.md`
3. See `ARCHITECTURE_VOCABULARY_STORAGE.md` for technical details

---

**Status:** ✅ MVP Complete - 6,423 words ready!  
**Next:** Week 3 - Achievement System  
**Version:** 1.0.0
