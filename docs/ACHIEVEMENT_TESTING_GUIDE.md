# 🧪 Achievement System - Testing Guide

**Version:** 1.0  
**Purpose:** Verify all 32 achievements unlock correctly  
**Estimated Testing Time:** 2-3 hours

---

## 🎯 Testing Strategy

### Testing Levels:
1. **Unit Testing** - Individual achievement unlock logic
2. **Integration Testing** - Achievement system with learning flow
3. **UI Testing** - Display and animations
4. **Edge Case Testing** - Boundary conditions

---

## ✅ Quick Test Checklist

### Pre-Testing Setup:
- [ ] App running in development mode
- [ ] Database initialized with fresh data
- [ ] No previous achievement data (or reset it)
- [ ] Console logging enabled for debugging

---

## 📋 Achievement Test Cases

### Category 1: First Steps (5 achievements)

#### 🌱 First Word
- **ID:** `first_word`
- **Test:** Complete your first word
- **Steps:**
  1. Start a new learning session
  2. Answer the first question (correct or incorrect)
  3. **Expected:** Achievement unlocks immediately
- **Points:** 10
- **Status:** [ ] Pass [ ] Fail

#### 🎯 First Session
- **ID:** `first_session`
- **Test:** Complete your first session
- **Steps:**
  1. Complete a full 20-word session
  2. Finish session
  3. **Expected:** Achievement unlocks at session end
- **Points:** 20
- **Status:** [ ] Pass [ ] Fail

#### ✅ First Day
- **ID:** `first_day`
- **Test:** Complete daily goal on day 1
- **Steps:**
  1. Complete session on first day of use
  2. **Expected:** Achievement unlocks after session
- **Points:** 30
- **Status:** [ ] Pass [ ] Fail

#### ⭐ Rising Star
- **ID:** `first_level_up`
- **Test:** Advance to next CEFR level
- **Steps:**
  1. Complete all words at current level
  2. Change level in settings
  3. **Expected:** Achievement unlocks on level change
- **Points:** 50
- **Status:** [ ] Pass [ ] Fail
- **Note:** May need to manually change level in settings

#### ⚙️ Customizer
- **ID:** `settings_visited`
- **Test:** Visit settings
- **Steps:**
  1. Navigate to Settings screen
  2. Change any setting (language, level, etc.)
  3. **Expected:** Achievement unlocks immediately
- **Points:** 10
- **Status:** [ ] Pass [ ] Fail

---

### Category 2: Streak Warriors (6 achievements)

#### 🔥 Streak Starter (3 days)
- **ID:** `streak_3`
- **Test:** 3-day streak
- **Steps:**
  1. Complete session on Day 1
  2. Complete session on Day 2 (next calendar day)
  3. Complete session on Day 3
  4. **Expected:** Achievement unlocks after Day 3 session
- **Points:** 30
- **Status:** [ ] Pass [ ] Fail
- **Testing Shortcut:** Manually update `user_statistics.last_activity_date` in database

#### 🔥 Week Warrior (7 days)
- **ID:** `streak_7`
- **Points:** 100
- **Status:** [ ] Pass [ ] Fail
- **Testing:** Same as above, continue to day 7

#### 🔥 Dedicated Learner (14 days)
- **ID:** `streak_14`
- **Points:** 200
- **Status:** [ ] Pass [ ] Fail

#### 🔥 Month Master (30 days)
- **ID:** `streak_30`
- **Points:** 500
- **Status:** [ ] Pass [ ] Fail

#### 💯 Centurion (100 days)
- **ID:** `streak_100`
- **Points:** 2000
- **Status:** [ ] Pass [ ] Fail

#### 👑 Legendary Streak (365 days)
- **ID:** `streak_365`
- **Points:** 10000
- **Status:** [ ] Pass [ ] Fail

**Testing Note:** For long streaks, update database directly:
```sql
UPDATE user_statistics 
SET current_streak_days = 7 
WHERE id = 1;
```

---

### Category 3: Word Mastery (7 achievements)

#### 📚 Vocabulary Builder (10 words)
- **ID:** `words_10`
- **Test:** Master 10 words
- **Steps:**
  1. Practice words until confidence ≥ 71 (mastered status)
  2. Reach 10 mastered words
  3. **Expected:** Achievement unlocks after session
- **Points:** 20
- **Status:** [ ] Pass [ ] Fail

#### 📚 Word Collector (50 words)
- **ID:** `words_50`
- **Points:** 100
- **Status:** [ ] Pass [ ] Fail

#### 💯 Hundred Club (100 words)
- **ID:** `words_100`
- **Points:** 200
- **Status:** [ ] Pass [ ] Fail

#### 📖 Word Enthusiast (250 words)
- **ID:** `words_250`
- **Points:** 500
- **Status:** [ ] Pass [ ] Fail

#### 🎓 Vocabulary Master (500 words)
- **ID:** `words_500`
- **Points:** 1000
- **Status:** [ ] Pass [ ] Fail

#### 🧙‍♂️ Word Wizard (1000 words)
- **ID:** `words_1000`
- **Points:** 2500
- **Status:** [ ] Pass [ ] Fail

#### 🌟 Polyglot Legend (5000 words)
- **ID:** `words_5000`
- **Points:** 10000
- **Status:** [ ] Pass [ ] Fail

**Testing Shortcut:** Update word progress in database:
```sql
UPDATE user_word_progress 
SET status = 'mastered', confidence_level = 75 
WHERE word_id IN (SELECT id FROM words LIMIT 10);
```

---

### Category 4: Speed Learning (4 achievements)

#### ⚡ Quick Learner
- **ID:** `speed_20_in_10min`
- **Test:** 20 words in under 10 minutes
- **Steps:**
  1. Start session
  2. Answer 20 questions quickly (< 30 seconds each)
  3. Complete session
  4. **Expected:** Achievement unlocks if total time < 600 seconds
- **Points:** 50
- **Status:** [ ] Pass [ ] Fail

#### 🚀 Speed Demon
- **ID:** `speed_50_in_session`
- **Test:** 50 words in one session
- **Steps:**
  1. Modify `WORDS_PER_SESSION` to 50 temporarily
  2. Complete session with 50 words
  3. **Expected:** Achievement unlocks at session end
- **Points:** 150
- **Status:** [ ] Pass [ ] Fail

#### 🏃 Marathon Runner
- **ID:** `speed_100_in_session`
- **Test:** 100 words in one session
- **Steps:**
  1. Modify `WORDS_PER_SESSION` to 100
  2. Complete session
- **Points:** 500
- **Status:** [ ] Pass [ ] Fail

#### 🌅 Early Bird
- **ID:** `morning_learner`
- **Test:** Session before 8 AM
- **Steps:**
  1. Change device time to 7:00 AM
  2. Complete session
  3. **Expected:** Achievement unlocks at session end
- **Points:** 30
- **Status:** [ ] Pass [ ] Fail

---

### Category 5: Perfect Performance (4 achievements)

#### ✨ Perfect Start
- **ID:** `perfect_10`
- **Test:** 10 consecutive correct
- **Steps:**
  1. Start session
  2. Answer 10 questions correctly in a row
  3. **Expected:** Achievement unlocks immediately after 10th correct
- **Points:** 50
- **Status:** [ ] Pass [ ] Fail

#### 💎 Flawless
- **ID:** `perfect_20`
- **Test:** 20 consecutive correct
- **Steps:**
  1. Answer 20 questions correctly in a row
  2. **Expected:** Achievement unlocks immediately after 20th correct
- **Points:** 150
- **Status:** [ ] Pass [ ] Fail

#### 🎯 Perfectionist
- **ID:** `session_100_percent`
- **Test:** Session with 100% accuracy
- **Steps:**
  1. Complete entire session (20+ words)
  2. Answer all correctly
  3. **Expected:** Achievement unlocks at session end
- **Points:** 200
- **Status:** [ ] Pass [ ] Fail

#### 🏅 Accuracy Expert
- **ID:** `avg_accuracy_90`
- **Test:** 90%+ accuracy over 100 words
- **Steps:**
  1. Practice 100+ words total
  2. Maintain ≥90% accuracy
  3. **Expected:** Achievement unlocks when threshold met
- **Points:** 500
- **Status:** [ ] Pass [ ] Fail

---

### Category 6: Language Explorer (3 achievements)

#### 🌍 Polyglot Apprentice
- **ID:** `languages_2`
- **Test:** Practice 2 languages
- **Steps:**
  1. Complete session in Language 1 (e.g., en-es)
  2. Change to Language 2 in settings (e.g., en-fr)
  3. Complete session in Language 2
  4. **Expected:** Achievement unlocks after 2nd language practice
- **Points:** 100
- **Status:** [ ] Pass [ ] Fail
- **Note:** Requires multiple language datasets

#### 🌎 Multilingual (3 languages)
- **ID:** `languages_3`
- **Points:** 300
- **Status:** [ ] Pass [ ] Fail

#### 🌏 Language Master (5 languages)
- **ID:** `languages_5`
- **Points:** 1000
- **Status:** [ ] Pass [ ] Fail

---

### Category 7: Special/Hidden (3 achievements)

#### 🦉 Night Owl
- **ID:** `night_owl`
- **Test:** Session after midnight
- **Steps:**
  1. Change device time to 2:00 AM
  2. Complete session
  3. **Expected:** Achievement unlocks at session end
- **Points:** 30
- **Status:** [ ] Pass [ ] Fail
- **Hidden:** Yes (only shows when unlocked)

#### 🎉 Comeback Kid
- **ID:** `comeback_kid`
- **Test:** Return after 30+ days
- **Steps:**
  1. Set `last_activity_date` to 40 days ago in database
  2. Complete session
  3. **Expected:** Achievement unlocks at session start
- **Points:** 50
- **Status:** [ ] Pass [ ] Fail
- **Hidden:** Yes

#### 🗂️ Category Explorer
- **ID:** `categories_10`
- **Test:** Practice from 10 categories
- **Steps:**
  1. Practice words from 10 different categories
  2. **Expected:** Achievement unlocks when 10th category practiced
- **Points:** 150
- **Status:** [ ] Pass [ ] Fail

---

## 🎨 UI/UX Testing

### Achievement Screen Tests:
- [ ] Screen loads without errors
- [ ] All 32 achievements display
- [ ] Filters work (all, unlocked, locked)
- [ ] Categories display correctly
- [ ] Progress bars show for in-progress achievements
- [ ] Rarity colors display correctly
- [ ] Points display correctly
- [ ] Unlock dates show for unlocked achievements
- [ ] Hidden achievements only show when unlocked
- [ ] Scrolling is smooth
- [ ] Navigation works (back to home)

### Unlock Modal Tests:
- [ ] Modal appears when achievement unlocked
- [ ] Confetti animation plays
- [ ] Achievement icon displays large
- [ ] Title and description correct
- [ ] Points display correctly
- [ ] Rarity color in header
- [ ] Auto-dismiss after 5 seconds works
- [ ] Manual dismiss (tap button) works
- [ ] Multiple achievements queue properly
- [ ] Animations are smooth

### Home Screen Tests:
- [ ] 🏆 Trophy button appears
- [ ] Badge shows unlock count
- [ ] Clicking trophy navigates to achievements
- [ ] Achievement stats load correctly

---

## 🛠️ Database Testing Helpers

### Reset All Achievements:
```sql
DELETE FROM user_achievements;
```

### View Current Achievements:
```sql
SELECT a.id, a.title, ua.is_completed, ua.progress_value, ua.progress_max
FROM achievements a
LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
ORDER BY a.category, a.order_index;
```

### Manually Unlock Achievement:
```sql
INSERT INTO user_achievements (id, achievement_id, is_completed, progress_value, progress_max)
VALUES ('test_unlock_' || datetime('now'), 'first_word', 1, 100, 100);
```

### Check Total Points:
```sql
SELECT SUM(a.points) as total_points
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.is_completed = 1;
```

---

## 🐛 Bug Tracking Template

### Issue:
- **Achievement ID:** 
- **Expected Behavior:** 
- **Actual Behavior:** 
- **Steps to Reproduce:**
  1. 
  2. 
  3. 
- **Screenshots/Logs:** 
- **Priority:** High / Medium / Low
- **Status:** Open / In Progress / Fixed

---

## 📊 Test Results Summary

### Overall Results:
- **Total Achievements:** 32
- **Tested:** ___ / 32
- **Passed:** ___ / 32
- **Failed:** ___ / 32
- **Pass Rate:** ____%

### Category Breakdown:
- First Steps: ___ / 5
- Streak Warriors: ___ / 6
- Word Mastery: ___ / 7
- Speed Learning: ___ / 4
- Perfect Performance: ___ / 4
- Language Explorer: ___ / 3
- Special/Hidden: ___ / 3

### Critical Issues:
1. 
2. 
3. 

### Minor Issues:
1. 
2. 
3. 

---

## ✅ Sign-off

- [ ] All achievements tested
- [ ] Critical bugs fixed
- [ ] UI/UX reviewed
- [ ] Performance acceptable
- [ ] Ready for beta testing

**Tester:** _______________  
**Date:** _______________  
**Signature:** _______________

---

**Next Step:** Beta Testing with Real Users 🚀
