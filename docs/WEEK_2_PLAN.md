# 📚 Week 2: Expand Word Library (2000+ Words)

## Status: 🚀 IN PROGRESS

**Goal:** Increase vocabulary from 100 to 2000+ words with categories, difficulty levels, and smart selection
**Estimated Time:** 3-4 days
**Priority:** CRITICAL - Foundation for long-term engagement

---

## Why This Matters

### Current Problem:
- Only 100 words → Users finish in ~2 weeks
- No variety or progression
- No thematic learning (travel, food, etc.)
- Limited replayability

### After Week 2:
- 2000+ words → ~20 weeks of content
- 50+ categories for focused learning
- Difficulty progression (beginner → advanced)
- Frequency-based smart selection
- Users can choose topics they care about

**Expected Impact:** +150% retention at D30, +300% lifetime value

---

## Implementation Plan

### Phase 1: Data Sourcing & Preparation (Day 1)
**Tasks:**
1. Find quality English-Spanish word datasets
2. Validate translations
3. Add categories to each word
4. Assign difficulty levels (1-10)
5. Add frequency rankings
6. Format as JSON

**Data Sources:**
- ✅ Wiktionary frequency lists (top 10,000 English words)
- ✅ FrequencyWords dataset (GitHub)
- ✅ Google 10,000 most common words
- ✅ Spanish CREA corpus for translations
- ✅ Manual curation for accuracy

---

### Phase 2: Database Schema Updates (Day 1)
**Tasks:**
1. Add new columns to words table
2. Create categories table
3. Update database initialization
4. Create migration script

**Schema Changes:**
```sql
-- Add columns to words table
ALTER TABLE words ADD COLUMN category TEXT;
ALTER TABLE words ADD COLUMN difficulty INTEGER DEFAULT 5;
ALTER TABLE words ADD COLUMN frequency_rank INTEGER;
ALTER TABLE words ADD COLUMN part_of_speech TEXT;

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  description TEXT
);

-- Track user preferences
CREATE TABLE IF NOT EXISTS user_category_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  category_id INTEGER,
  enabled INTEGER DEFAULT 1,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

---

### Phase 3: Import Script (Day 2)
**Tasks:**
1. Create script to import 2000 words
2. Batch insert for performance
3. Validate data integrity
4. Handle duplicates
5. Create seed script for fresh installs

**Files to Create:**
- `scripts/prepareWords.js` - Fetch and format data
- `scripts/importWords.js` - Insert into database
- `src/data/words_2000.json` - Word dataset
- `src/data/categories.json` - Category definitions

---

### Phase 4: Category System (Day 2-3)
**Tasks:**
1. Define 50+ categories with icons
2. Create category filter UI
3. Update word selection algorithm
4. Add category screen

**Categories (50+):**

**Essential (10):**
- 🏠 Home & Family
- 🍽️ Food & Drink
- 👗 Clothing
- 🚗 Transportation
- 🏥 Health
- 💼 Work & Business
- 🏫 Education
- 🌆 City & Places
- ⏰ Time & Calendar
- 🌤️ Weather

**Lifestyle (10):**
- 🎮 Hobbies & Entertainment
- 🏋️ Sports & Fitness
- 🎨 Arts & Culture
- 🎵 Music
- 📚 Reading & Writing
- 🍳 Cooking
- 🛍️ Shopping
- 💰 Money & Finance
- 🏡 Housing
- 🔧 Tools & Equipment

**Travel (10):**
- ✈️ Travel & Tourism
- 🏨 Hotels & Accommodation
- 🗺️ Directions
- 🎫 Tickets & Reservations
- 🍴 Restaurants
- 🏛️ Sightseeing
- 🚕 Local Transport
- 🌍 Geography
- 🗣️ Common Phrases
- 🛂 Border & Customs

**Social (10):**
- 👥 People & Relationships
- 💬 Conversation
- 🎉 Events & Celebrations
- ❤️ Emotions & Feelings
- 🤝 Greetings & Politeness
- 👨‍👩‍👧 Family
- 👫 Friendship
- 💑 Romance
- 👔 Formal Speech
- 😂 Slang & Informal

**Nature & Science (10):**
- 🌳 Nature & Environment
- 🐕 Animals
- 🌺 Plants & Flowers
- 🌊 Water & Ocean
- ⛰️ Mountains & Hiking
- 🔬 Science
- 💻 Technology
- 📱 Digital & Internet
- 🌌 Space & Astronomy
- 🦠 Biology & Medicine

**Abstract (10):**
- 🧠 Thinking & Ideas
- 📊 Numbers & Math
- 🎯 Goals & Achievement
- ⚖️ Law & Politics
- 🕊️ Peace & Conflict
- 🔮 Future & Possibility
- 📜 History
- 🌈 Colors
- 📏 Shapes & Sizes
- 🔊 Sounds

---

### Phase 5: Smart Word Selection (Day 3)
**Tasks:**
1. Update word selection algorithm
2. Factor in difficulty level
3. Respect user preferences
4. Balance categories
5. Frequency-based progression

**Algorithm Updates:**
```javascript
// Intelligent word selection
function selectWords(count = 20, options = {}) {
  const {
    minDifficulty = 1,
    maxDifficulty = 10,
    categories = [], // empty = all categories
    preferHighFrequency = true,
    balanceCategories = true
  } = options;
  
  // 1. Get user's current level
  const userLevel = getUserDifficultyLevel();
  
  // 2. Filter words by criteria
  // 3. Sort by: review_date, frequency, difficulty
  // 4. Balance across categories if requested
  // 5. Return diverse, appropriate words
}

// Auto-adjust difficulty based on performance
function adjustUserLevel() {
  const recentAccuracy = getRecentAccuracy(lastNSessions = 5);
  
  if (recentAccuracy > 0.85) {
    increaseDifficulty();
  } else if (recentAccuracy < 0.60) {
    decreaseDifficulty();
  }
}
```

---

### Phase 6: Word Library Browser (Day 3-4)
**Tasks:**
1. Create Word Library screen
2. Show all words with progress
3. Search functionality
4. Filter by category
5. Filter by difficulty
6. Sort options
7. Word detail modal

**UI Layout:**
```
┌─────────────────────────────────┐
│  📚 Word Library     [Search 🔍]│
├─────────────────────────────────┤
│  Filters: [All ▼] [Diff: 1-10 ▼]│
├─────────────────────────────────┤
│  ┌──────────────────────────┐   │
│  │ 🍽️ Food & Drink         │   │
│  │ 125 / 180 words mastered│   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ ✈️ Travel & Tourism      │   │
│  │ 45 / 150 words mastered │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ 💼 Work & Business       │   │
│  │ 12 / 200 words mastered │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

---

### Phase 7: Testing & Validation (Day 4)
**Tasks:**
1. Test word import
2. Verify translations
3. Test category filtering
4. Test difficulty progression
5. Check performance with 2000 words
6. Validate database queries

---

## File Structure

```
WordMasterApp/
├── src/
│   ├── data/
│   │   ├── words_2000.json (NEW) - 2000 word dataset
│   │   └── categories.json (NEW) - Category definitions
│   ├── screens/
│   │   └── WordLibraryScreen.js (NEW) - Browse all words
│   ├── components/
│   │   ├── CategoryCard.js (NEW) - Category selection
│   │   ├── WordCard.js (NEW) - Word display
│   │   └── FilterBar.js (NEW) - Search & filter
│   ├── services/
│   │   └── database.js (UPDATE) - New queries
│   └── utils/
│       └── wordSelection.js (NEW) - Smart selection
├── scripts/
│   ├── prepareWords.js (NEW) - Data preparation
│   └── importWords.js (NEW) - Database import
```

---

## Data Format

### words_2000.json
```json
[
  {
    "english": "hello",
    "spanish": "hola",
    "category": "greetings",
    "difficulty": 1,
    "frequency_rank": 15,
    "part_of_speech": "interjection",
    "example_en": "Hello, how are you?",
    "example_es": "Hola, ¿cómo estás?"
  },
  {
    "english": "restaurant",
    "spanish": "restaurante",
    "category": "food_drink",
    "difficulty": 3,
    "frequency_rank": 458,
    "part_of_speech": "noun",
    "example_en": "We ate at a nice restaurant",
    "example_es": "Comimos en un restaurante agradable"
  }
]
```

### categories.json
```json
[
  {
    "id": "food_drink",
    "name": "Food & Drink",
    "icon": "🍽️",
    "color": "#FF6B6B",
    "description": "Words related to food, drinks, and dining"
  },
  {
    "id": "travel",
    "name": "Travel & Tourism",
    "icon": "✈️",
    "color": "#4ECDC4",
    "description": "Essential vocabulary for travelers"
  }
]
```

---

## Database Queries to Add

```javascript
// Get words by category
async function getWordsByCategory(category, limit = 20) {
  const query = `
    SELECT w.*, p.easiness_factor, p.review_count
    FROM words w
    LEFT JOIN learning_progress p ON w.id = p.word_id
    WHERE w.category = ?
    ORDER BY p.next_review_date ASC
    LIMIT ?
  `;
  return await db.getAllAsync(query, [category, limit]);
}

// Get words by difficulty range
async function getWordsByDifficulty(minDiff, maxDiff, limit = 20) {
  const query = `
    SELECT * FROM words
    WHERE difficulty BETWEEN ? AND ?
    ORDER BY frequency_rank ASC
    LIMIT ?
  `;
  return await db.getAllAsync(query, [minDiff, maxDiff, limit]);
}

// Get category statistics
async function getCategoryStats() {
  const query = `
    SELECT 
      w.category,
      COUNT(*) as total_words,
      SUM(CASE WHEN p.review_count >= 3 THEN 1 ELSE 0 END) as mastered_words
    FROM words w
    LEFT JOIN learning_progress p ON w.id = p.word_id
    GROUP BY w.category
  `;
  return await db.getAllAsync(query);
}

// Search words
async function searchWords(searchTerm) {
  const query = `
    SELECT * FROM words
    WHERE english LIKE ? OR spanish LIKE ?
    LIMIT 50
  `;
  const term = `%${searchTerm}%`;
  return await db.getAllAsync(query, [term, term]);
}
```

---

## Navigation Updates

Add Word Library to navigation:

```javascript
// In App.js or navigation setup
import WordLibraryScreen from './src/screens/WordLibraryScreen';

// Add to stack navigator
<Stack.Screen 
  name="WordLibrary" 
  component={WordLibraryScreen}
  options={{
    title: "Word Library",
    headerShown: true
  }}
/>

// Add button on Home screen
<TouchableOpacity onPress={() => navigation.navigate('WordLibrary')}>
  <Text>📚 Browse All Words</Text>
</TouchableOpacity>
```

---

## Success Criteria

### Week 2 is complete when:
- ✅ 2000+ words imported successfully
- ✅ All words have categories, difficulty, frequency
- ✅ Category system working
- ✅ Smart word selection respects filters
- ✅ Word Library screen functional
- ✅ Search and filter working
- ✅ Performance is good (no lag)
- ✅ Translations validated (spot check 100 words)
- ✅ Database queries optimized

---

## Testing Checklist

### Functional Tests:
- [ ] Import script runs without errors
- [ ] All 2000 words in database
- [ ] Categories display correctly
- [ ] Category filtering works
- [ ] Difficulty filtering works
- [ ] Search finds words
- [ ] Word details show correct info
- [ ] Learning session uses new words
- [ ] Progress tracked for all words

### Performance Tests:
- [ ] Database queries < 100ms
- [ ] Word Library loads in < 1s
- [ ] Search is responsive
- [ ] No memory leaks
- [ ] App size < 50MB

### Data Quality Tests:
- [ ] No duplicate words
- [ ] All translations correct (sample check)
- [ ] Categories make sense
- [ ] Difficulty levels appropriate
- [ ] Frequency ranks valid

---

## Potential Issues & Solutions

### Issue 1: Finding 2000 quality word pairs
**Solution:** Use Wiktionary + manual validation, start with 1000 if needed

### Issue 2: Translation quality
**Solution:** Cross-reference multiple sources, spot-check 10% manually

### Issue 3: Performance with large dataset
**Solution:** Index database columns, lazy load, pagination

### Issue 4: Category assignment
**Solution:** Use NLP libraries or manual curation for top 500, automated for rest

### Issue 5: App size too large
**Solution:** Use JSON not images, compress data, lazy load categories

---

## Next Steps After Week 2

Once word library is complete:

1. **Week 3:** Achievement System
   - "Master of Food" badge (complete food category)
   - "Polyglot" badge (learn 100 words)
   - "Explorer" badge (try 10 categories)

2. **User Engagement:**
   - Category challenges
   - Daily category spotlight
   - Personalized recommendations

3. **Content Updates:**
   - Add 1000 more words (Phase 3)
   - Add more language pairs
   - User-submitted words

---

## Development Timeline

### Day 1 (Today):
- ✅ Create this plan
- 🔲 Source word data
- 🔲 Define categories
- 🔲 Update database schema
- 🔲 Create migration script

### Day 2:
- 🔲 Prepare 2000 words dataset
- 🔲 Create import scripts
- 🔲 Import words to database
- 🔲 Validate data
- 🔲 Update word selection algorithm

### Day 3:
- 🔲 Create Word Library screen
- 🔲 Add category filters
- 🔲 Implement search
- 🔲 Add to navigation
- 🔲 Test functionality

### Day 4:
- 🔲 Performance testing
- 🔲 Bug fixes
- 🔲 Polish UI
- 🔲 Update documentation
- 🔲 Final validation

---

## Resources Needed

### Data Sources:
1. **Wiktionary Frequency Lists**
   - https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists
   - English: Top 10,000 words
   - Spanish translations

2. **FrequencyWords Dataset**
   - https://github.com/hermitdave/FrequencyWords
   - English and Spanish word frequencies

3. **Google 10,000**
   - https://github.com/first20hours/google-10000-english

4. **Spanish Resources:**
   - Real Academia Española (RAE)
   - WordReference.com for validation
   - SpanishDict for examples

---

## Metrics to Track

### Before Week 2:
- Total words: 100
- Categories: 0
- User sessions: Low variety
- Words per session: Random 20

### After Week 2:
- Total words: 2000+
- Categories: 50+
- User sessions: Themed learning
- Words per session: Smart, progressive

### Expected Impact:
- +150% content volume
- +200% learning paths
- +100% user choice
- +80% long-term retention

---

## Git Commits

```bash
# Day 1
git commit -m "feat: Add database schema for categories and word metadata"

# Day 2
git commit -m "feat: Import 2000 words with categories and difficulty levels"

# Day 3
git commit -m "feat: Add Word Library screen with search and filters"

# Day 4
git commit -m "feat: Week 2 complete - Expanded word library to 2000+ words"
```

---

## 🎯 Let's Start!

**Ready to begin Week 2?**

I'll start by:
1. ✅ Creating database schema updates
2. ✅ Sourcing word data from Wiktionary
3. ✅ Setting up category system
4. ✅ Creating import script

**Shall we begin with Step 1: Database Schema?** 🚀
