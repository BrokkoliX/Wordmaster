# Wordmaster - Next Steps Roadmap

## 📋 Current Status (Feb 12, 2024)

### ✅ Completed Features
- 5 languages (EN, ES, FR, DE, HU) with ~83k translations
- CEFR levels (A1-C2)
- Spaced repetition (SM-2 algorithm)
- Achievement system
- Streak tracking
- Multi-language UI
- Bug fixes (direction consistency, distractor filtering)

### ⚠️ Known Gaps
- ~30% translation placeholders ([NEED:word])
- TTS exists but not fully integrated
- No Hungarian/French/German pronunciation
- No progress backup/restore
- No cross-language pairs (es-fr, de-hu, etc.)

---

## 🎯 Recommended Priority Order

### **Phase 1: Fill Translation Gaps (High Priority)**
**Impact**: High | **Effort**: Medium | **Timeline**: 2-3 days

**Problem**: 
- French: 26% placeholders (7,853 words)
- German: 37% placeholders (10,956 words)
- Hungarian: 61% placeholders (18,282 words)

**Solutions**:

#### Option A: DeepL API (Recommended)
- **Cost**: Free tier (500k chars/month)
- **Coverage**: Can translate ~20k-25k words/month
- **Quality**: Excellent
- **Timeline**: 2 months for all gaps (free tier)

**Implementation**:
```bash
# Already have: translateFrequencyWords.js script
cd WordMasterApp
export DEEPL_API_KEY="your-key"
node scripts/translateFrequencyWords.js --lang=fr --api=deepl --fill-gaps
```

#### Option B: OpenAI GPT-4
- **Cost**: ~$2-3 for all gaps
- **Timeline**: 1 day
- **Quality**: Excellent

#### Option C: Manual Curation
- Focus on A1-B1 (first 3000 words) only
- Use GPT-4 for quality translations
- **Cost**: ~$0.50
- **Timeline**: 1 day

**Recommended**: **Option C** - Fill A1-B1 gaps with GPT-4 (~9,000 words)
- Most important beginner words
- Low cost
- Immediate impact

---

### **Phase 2: Enhance Audio Pronunciation (High Priority)**
**Impact**: High | **Effort**: Low | **Timeline**: 4 hours

**Current State**:
- TTS service exists but only used for Spanish
- No support for French, German, Hungarian

**Implementation**:

1. **Update TTS Service** (1 hour)
   - Add Hungarian: `'hu': 'hu-HU'`
   - Already has French and German codes

2. **Integrate in Learning Screen** (2 hours)
   - Auto-pronounce question word
   - Add speaker button for replay
   - Support all 5 languages dynamically

3. **Add Settings Toggle** (1 hour)
   - Enable/disable pronunciation
   - Speed control (already exists)

**Files to modify**:
- `src/services/TTSService.js` - Add Hungarian
- `src/screens/LearningScreen.js` - Use dynamic language
- `src/screens/SettingsScreen.js` - Add TTS toggle

**Code snippet**:
```javascript
// In LearningScreen.js, loadQuestion function
const targetLang = word.target_lang; // 'fr', 'de', 'hu', etc.
await ttsService.speakWord(mcQuestion.question, targetLang);
```

---

### **Phase 3: Progress Backup & Cloud Sync (Medium Priority)**
**Impact**: Medium | **Effort**: High | **Timeline**: 1-2 weeks

**Features**:
- Export progress to JSON
- Import progress from backup
- Optional: Firebase/Supabase cloud sync

**Implementation**:

1. **Export Function** (4 hours)
```javascript
// Export user progress
export const exportProgress = async () => {
  const db = SQLite.openDatabaseSync('wordmaster.db');
  
  const progress = await db.getAllAsync(
    'SELECT * FROM user_word_progress'
  );
  
  const stats = await getUserStatistics();
  
  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    progress,
    stats
  };
};
```

2. **Import Function** (4 hours)
```javascript
export const importProgress = async (data) => {
  // Validate format
  // Merge or replace progress
  // Update statistics
};
```

3. **UI Integration** (4 hours)
- Settings: "Backup & Restore"
- Export to file
- Import from file
- Share via email/drive

**Optional Cloud Sync** (1 week):
- Firebase/Supabase integration
- Auto-sync on app open/close
- Conflict resolution

---

### **Phase 4: Enhanced Learning Modes (Medium Priority)**
**Impact**: High | **Effort**: Medium | **Timeline**: 1 week

**New Modes**:

#### 1. **Typing Practice** (2 days)
- Type translation instead of multiple choice
- Better for active recall
- Harder but more effective

#### 2. **Reverse Mode** (1 day)
- Practice English → Target language
- Optional setting per user
- Currently only Target → English

#### 3. **Listening Mode** (2 days)
- Hear word, choose translation
- No text shown initially
- Requires TTS integration

#### 4. **Sentence Practice** (3 days)
- Use Tatoeba sentence database
- Practice words in context
- More advanced feature

---

### **Phase 5: Performance Optimizations (Low Priority)**
**Impact**: Medium | **Effort**: Medium | **Timeline**: 3-4 days

**Optimizations**:

1. **Database Indexing** (1 day)
   - Add indexes on frequently queried columns
   - Already has some indexes, add more

2. **Lazy Loading** (1 day)
   - Load words in batches
   - Reduce initial load time

3. **Caching** (1 day)
   - Cache frequently used queries
   - Redux/Context for state management

4. **Bundle Optimization** (1 day)
   - Code splitting
   - Reduce bundle size
   - Faster app startup

---

### **Phase 6: Cross-Language Pairs (Low Priority)**
**Impact**: Low | **Effort**: High | **Timeline**: 1 week

**Examples**:
- Spanish ↔ French (currently: 2,831 words)
- Spanish ↔ German (currently: 2,577 words)
- Spanish ↔ Hungarian (currently: 768 words)

**Challenge**: Limited vocabulary in database

**Solutions**:
1. Use existing English as intermediary
2. Download additional bilingual dictionaries
3. AI translation of missing pairs

**Recommended**: Defer until main languages are polished

---

### **Phase 7: UI/UX Improvements (Medium Priority)**
**Impact**: Medium | **Effort**: Medium | **Timeline**: 1 week

**Improvements**:

1. **Better Onboarding** (2 days)
   - Tutorial screens
   - Interactive walkthrough
   - Language selection wizard

2. **Progress Visualization** (2 days)
   - Charts/graphs
   - Word mastery heatmap
   - Learning trends

3. **Dark Mode** (1 day)
   - Respect system theme
   - Manual toggle

4. **Animations** (2 days)
   - Smoother transitions
   - Celebration effects
   - Better feedback

---

### **Phase 8: Analytics & Insights (Low Priority)**
**Impact**: Medium | **Effort**: Medium | **Timeline**: 5 days

**Features**:

1. **Learning Analytics** (2 days)
   - Words per day
   - Accuracy over time
   - Difficult words identification
   - Best learning time

2. **Recommendations** (2 days)
   - Suggest optimal review time
   - Identify weak categories
   - Personalized tips

3. **Export Reports** (1 day)
   - PDF progress report
   - Share achievements

---

## 🏆 Recommended Next 3 Steps (This Week)

### Step 1: Fill A1-B1 Translation Gaps (1 day)
**Why**: Biggest user impact for beginners
**How**: Use GPT-4 to translate ~9,000 most common words
**Cost**: ~$1
**Files**: Update words_french.json, words_german.json, words_hungarian.json

### Step 2: Integrate TTS for All Languages (4 hours)
**Why**: Easy win, high value
**How**: Update LearningScreen to use dynamic TTS
**Cost**: $0
**Files**: LearningScreen.js, TTSService.js

### Step 3: Add Export/Import Progress (8 hours)
**Why**: Users want backup
**How**: JSON export/import functions
**Cost**: $0
**Files**: New exportService.js, SettingsScreen.js

---

## 📊 Priority Matrix

```
High Impact, Low Effort (DO FIRST):
  • TTS Integration (4 hours)
  • A1-B1 Translation Gaps ($1, 1 day)

High Impact, High Effort (PLAN):
  • Complete Translation Gaps (free, 2 months)
  • New Learning Modes (1 week)

Low Impact, Low Effort (QUICK WINS):
  • Dark mode (1 day)
  • Better animations (2 days)

Low Impact, High Effort (DEFER):
  • Cross-language pairs (1 week)
  • Cloud sync (1 week)
```

---

## 💰 Cost Estimate

| Feature | Cost | Timeline |
|---------|------|----------|
| Fill A1-B1 gaps (GPT-4) | $1 | 1 day |
| Fill all gaps (DeepL free) | $0 | 2 months |
| Fill all gaps (GPT-4) | $3 | 1 day |
| TTS integration | $0 | 4 hours |
| Progress backup | $0 | 8 hours |
| Cloud sync (Firebase) | $0-25/month | 1 week |
| All Phase 1-3 features | $1-3 | 1 week |

---

## 🎯 Suggested 2-Week Sprint

### Week 1: Core Improvements
- **Day 1**: Fill A1-B1 translation gaps (French, German, Hungarian)
- **Day 2**: Integrate TTS for all languages
- **Day 3**: Add export/import progress
- **Day 4**: Testing & bug fixes
- **Day 5**: UI polish & animations

### Week 2: New Features
- **Day 6-7**: Typing practice mode
- **Day 8-9**: Reverse learning mode
- **Day 10**: Better onboarding
- **Day 11**: Progress visualization
- **Day 12**: Testing & deployment

---

## 📝 Quick Wins (< 1 day each)

1. **Add Hungarian to TTS** (30 min)
   - One line in TTSService.js

2. **Dynamic pronunciation in learning** (2 hours)
   - Auto-speak based on target_lang

3. **Add speaker button** (1 hour)
   - Replay pronunciation on demand

4. **Filter placeholders from learning** (1 hour)
   - Don't show [NEED:word] as questions

5. **Add word count by language to Settings** (1 hour)
   - Show "22,147 words available" dynamically

6. **Improve error messages** (2 hours)
   - Better user feedback

---

## 🚀 Long-term Vision (3-6 months)

- 10 languages with 100% coverage
- AI-generated sentence practice
- Community-contributed translations
- Voice recognition (speak to answer)
- Gamification (leaderboards, challenges)
- Premium features (unlimited languages, cloud sync)
- Mobile app optimization
- Web version
- Offline mode with downloadable packs

---

## ❓ Decision Points

**Should we prioritize?**
1. ✅ Quality (fill gaps) vs ❌ Quantity (more languages)
2. ✅ Core features vs ❌ Premium features
3. ✅ Mobile-first vs ❌ Cross-platform
4. ✅ Free forever vs ❌ Freemium model

**Recommendation**: Focus on quality and core features first

---

## 📞 Next Actions

**Choose one**:

**A) Quick wins** (4 hours total)
- Add TTS for all languages
- Add speaker button
- Filter placeholders
→ Immediate user impact

**B) Translation gaps** (1-2 days)
- Fill A1-B1 with GPT-4
- Professional quality
→ Better learning experience

**C) New features** (1 week)
- Typing mode
- Reverse mode
- Export/import
→ More functionality

**D) Let me know your priorities!**

What would you like to work on next?
