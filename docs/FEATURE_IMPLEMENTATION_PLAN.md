# Feature Implementation Plan

This document covers the implementation of six features built on top of the existing WordMaster architecture: React Native (Expo SDK 54) mobile app with local SQLite, a Node.js/Express backend with PostgreSQL, and delta-based progress sync between them.

---

## Architecture Principles

All six features follow the same patterns already established in the codebase.

**Local-first data.** The mobile app owns all user-facing data in SQLite. The backend is a sync target, not a gateway. Every feature must work offline and sync when connectivity returns.

**Delta sync.** `progressSyncService.js` pushes only records changed since the last successful sync. New tables follow the same pattern: track a `last_reviewed_at` or `updated_at` timestamp and only send the delta.

**Single database module.** All SQLite access goes through `db.js` (expo-sqlite). New tables are created inside `initDatabase()` in `database.js`, or in a dedicated `init*Tables()` function called from there (like `initAchievementTables()`).

**Service layer.** Each domain gets its own service file under `mobile/src/services/`. Screens call services, services call `db`. No raw SQL in screens.

**Batch backend writes.** The backend uses PostgreSQL `UNNEST`-based batch upserts (see `ProgressModel.syncWordProgress`). New sync endpoints follow this pattern to keep connection hold time O(1).

---

## Shared Infrastructure (Build First)

Before implementing individual features, these shared pieces are needed by multiple features and should be built once.

### 1. Aggregate query helpers in `database.js`

Several features need the same underlying queries: words with the highest `times_incorrect`, accuracy grouped by CEFR level, accuracy grouped by category, and words reviewed per day. Build these as exported async functions in `database.js` so they can be consumed by Mistake Journal, Weak Area Detection, and Analytics without duplicating SQL.

```
getWordsWithHighestErrorRate(limit)       // used by features 1, 5
getAccuracyByCefrLevel()                  // used by features 4, 5
getAccuracyByCategory()                   // used by features 4, 5
getDailyReviewCounts(days)                // used by features 3, 4
getWordProgressDistribution()             // used by feature 4
```

### 2. Lightweight charting

Features 4 (Analytics) and 1 (Mistake Journal trend) need simple charts. Install `react-native-svg` and `victory-native` (or the lighter `react-native-chart-kit`). Evaluate bundle impact before choosing; `react-native-chart-kit` is ~40 KB smaller but less flexible.

### 3. Notification service wrapper

Feature 6 (Reminders) needs push notifications. Feature 3 (Daily Challenges) benefits from them. Create `mobile/src/services/notificationService.js` that wraps `expo-notifications` with helpers for scheduling, canceling, and handling permissions. This keeps notification logic out of screens.

---

## Feature 1: Mistake Journal / Error Analysis

### Data source

No new tables required. All data lives in `user_word_progress` already: `times_incorrect`, `times_shown`, `times_correct`, `consecutive_correct`, and `status` per word.

### New service: `mobile/src/services/mistakeJournalService.js`

```
getMistakes(limit = 50)
```
Queries words where `times_incorrect > 0`, joined with the `words` table to get word text, translation, category, and CEFR level. Ordered by error rate (`times_incorrect / times_shown`) descending, then by total `times_incorrect` descending. Returns an array of enriched word objects.

```
getMistakeSummary()
```
Returns aggregate stats: total unique words with errors, most common error category, most common error CEFR level, and overall incorrect rate.

```
getReviewSessionFromMistakes(limit = 20)
```
Returns the top N mistake words formatted identically to what `getWordsDueForReview` returns, so existing learning screens can consume them without changes.

### New screen: `MistakeJournalScreen.js`

Located under `mobile/src/screens/`. Two sections displayed in a ScrollView.

**Summary card** at the top showing total mistake words, worst category, and a "Practice Mistakes" button.

**Scrollable word list** below, where each row shows the word, translation, error count, accuracy percentage, and current status. Tapping a row could expand it inline to show detail (times shown, consecutive correct, last reviewed).

The "Practice Mistakes" button navigates to the existing `LearningScreen` with a new route param `source: 'mistakes'`. `LearningScreen.initializeSession` checks for this param and, when present, calls `getReviewSessionFromMistakes()` instead of the normal review+new word mix.

### Navigation changes in `MainTabs.js`

Add `MistakeJournalScreen` as a screen inside `HomeStack` (accessible from Dashboard) or inside `ProgressStack`. A quick-access card on `HomeScreen` links to it when the user has > 0 mistake words.

### Backend sync

No backend changes needed. Mistake data is already synced via `user_word_progress`. The journal is a read-only view of existing local data.

### Implementation order

1. Add aggregate query helpers to `database.js`.
2. Create `mistakeJournalService.js`.
3. Create `MistakeJournalScreen.js` with summary and list.
4. Add `source: 'mistakes'` handling in `LearningScreen.initializeSession`.
5. Wire into navigation and add entry point on HomeScreen.

---

## Feature 2: Custom Word Lists / Favorites

### New SQLite tables (added in `initDatabase()`)

```sql
CREATE TABLE IF NOT EXISTS word_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📝',
  color TEXT DEFAULT '#3498DB',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS word_list_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  word_id TEXT NOT NULL,
  added_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (list_id) REFERENCES word_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id),
  UNIQUE(list_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_word_list_items_list
ON word_list_items(list_id);
```

A built-in "Favorites" list is auto-created on first launch with `id = '__favorites__'`.

### New service: `mobile/src/services/wordListService.js`

```
createList(name, description, icon, color)
updateList(listId, fields)
deleteList(listId)
getAllLists()                              // returns lists with item counts
getListWords(listId)                      // joined with words table
addWordToList(listId, wordId)
removeWordFromList(listId, wordId)
toggleFavorite(wordId)                    // shortcut for the __favorites__ list
isWordFavorited(wordId)
exportList(listId)                        // returns JSON string
importList(jsonString)                    // creates list from JSON
```

### New screens

**`WordListsScreen.js`** -- shows all user-created lists in a grid or list layout. Each card shows name, icon, word count, and a "Practice" button. A floating action button creates a new list via an inline modal (name, icon picker, color picker).

**`WordListDetailScreen.js`** -- shows words in a specific list. Each row has a remove button. Header has "Practice this list" and "Export" actions.

### UI additions to existing screens

Add a bookmark/heart icon button to every learning screen (`LearningScreen`, `MatchingPairsScreen`, `TypeTranslationScreen`, `FillInBlankScreen`) next to the word display. Tapping it calls `toggleFavorite(wordId)`. The icon fills/unfills based on `isWordFavorited`.

On `SummaryScreen`, show a "Save difficult words to a list" prompt that pre-selects words the user got wrong in the session. The user picks a target list from a bottom sheet.

### Practicing a custom list

The "Practice" button on a list navigates to `ModeSelectionScreen` with `source: 'list'` and `listId` params. When `LearningScreen.initializeSession` sees `source: 'list'`, it calls `getListWords(listId)` instead of the normal review query. The same pattern works for all four exercise modes.

### Export/import

`exportList` serializes the list metadata and its word IDs to a JSON object. `importList` creates a new list and resolves word IDs against the local `words` table (skipping any that don't exist locally). Share via `expo-sharing` (already a dependency).

### Backend sync

Add a new table `user_word_lists` and `user_word_list_items` in PostgreSQL. Add a `/progress/sync` extension that includes `wordLists` and `wordListItems` arrays in the sync payload. The sync service sends list changes alongside progress changes. This is optional for MVP; local-only lists work fine initially.

### Implementation order

1. Add SQLite tables in `initDatabase()`.
2. Create `wordListService.js`.
3. Create `WordListsScreen.js` and `WordListDetailScreen.js`.
4. Add bookmark button to learning screens.
5. Add `source: 'list'` handling in `LearningScreen.initializeSession`.
6. Wire screens into navigation (new tab or entry in ProgressStack/HomeStack).
7. Add export/import functionality.
8. Backend sync (deferred to v2).

---

## Feature 3: Daily Challenges

### New SQLite tables (added in `initDatabase()`)

```sql
CREATE TABLE IF NOT EXISTS daily_challenges (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  challenge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  category_filter TEXT,
  cefr_filter TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenge_streaks (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date TEXT,
  total_completed INTEGER DEFAULT 0
);
```

### Challenge generation: `mobile/src/services/dailyChallengeService.js`

```
getTodayChallenge()
generateChallenge(date)
updateChallengeProgress(type, incrementValue)
completeChallenge(challengeId)
getChallengeHistory(limit = 30)
getChallengeStreak()
```

`generateChallenge` uses a deterministic seed (user ID + date string) to pick a challenge type and parameters so the same user always sees the same challenge for a given day, even if the app restarts.

Challenge types (enum):
- `review_words` -- "Review N words today" (N = 10/15/20/30)
- `learn_new` -- "Learn N new CEFR-level words" (N = 3/5/10)
- `category_focus` -- "Practice N words from Category" (random category from `categories`)
- `accuracy_target` -- "Achieve N% accuracy in a session" (N = 80/85/90)
- `session_count` -- "Complete N sessions today" (N = 2/3)

The generator weights challenge types based on user history. If the user has many due reviews, prefer `review_words`. If accuracy is low, prefer `accuracy_target`. The category for `category_focus` is chosen randomly from categories the user has words in.

### Progress tracking hooks

`updateChallengeProgress` is called from `completeSession` in `database.js`. After a session completes, the function checks today's challenge type and increments `current_value` accordingly:
- `review_words` increments by `wordsReviewed`
- `learn_new` increments by counting words in the session with no prior progress
- `accuracy_target` sets the value to the session accuracy if higher
- `session_count` increments by 1

When `current_value >= target_value`, the challenge auto-completes and updates the challenge streak.

### UI integration

**HomeScreen card.** Add a "Daily Challenge" card between the streak display and stats cards. Shows the challenge title, a progress bar (`current_value / target_value`), and a completion badge when done. Tapping it navigates to the relevant exercise mode with the challenge's filters pre-applied.

**Completion celebration.** When a challenge completes, show a brief modal (reuse `AchievementUnlockModal` pattern) congratulating the user and showing the challenge streak.

### Achievement integration

Add new achievements in `achievementDatabase.js`:
- `challenge_streak_7` -- 7-day challenge streak
- `challenge_streak_30` -- 30-day challenge streak
- `challenge_total_50` -- 50 total challenges completed

Check these in `achievementService.checkAllAchievements()`.

### Backend sync

The challenge is generated and tracked locally. Include `daily_challenges` in the sync payload if cross-device continuity is needed. For MVP, local-only is sufficient since challenges are ephemeral by nature.

### Implementation order

1. Add SQLite tables in `initDatabase()`.
2. Create `dailyChallengeService.js` with generation and progress logic.
3. Add `updateChallengeProgress` call in `completeSession` (`database.js`).
4. Add Daily Challenge card to `HomeScreen`.
5. Add completion modal.
6. Add challenge-related achievements.
7. Optional: `ChallengeHistoryScreen.js` showing past challenges.

---

## Feature 4: Detailed Progress Analytics

### Data source

All data already exists in `user_word_progress`, `sessions`, and `user_statistics`. This feature is purely a visualization layer.

### New service: `mobile/src/services/analyticsService.js`

```
getWeeklyStats(weeksBack = 4)
```
Returns an array of `{ weekStart, wordsReviewed, wordsLearned, avgAccuracy, sessionsCount }` by aggregating `sessions` rows grouped by ISO week.

```
getDailyStats(daysBack = 30)
```
Returns per-day stats: `{ date, wordsReviewed, correctAnswers, accuracy, newWordsIntroduced }`.

```
getAccuracyTrend(daysBack = 30)
```
Returns `{ date, accuracy }` pairs from sessions, smoothed with a 3-day rolling average.

```
getCefrLevelProgress()
```
Returns per-level stats: `{ level, totalWords, learned, mastered, accuracy }` by joining `words` and `user_word_progress` grouped by `cefr_level`.

```
getCategoryPerformance()
```
Returns per-category stats: `{ categoryId, categoryName, totalWords, learned, mastered, accuracy }`.

```
getReviewVsNewRatio(daysBack = 30)
```
Returns `{ date, reviewCount, newCount }` to show how the user's time is split.

```
getLearningVelocity()
```
Returns `{ wordsPerDay, estimatedDaysToNextLevel, currentLevel }` based on the moving average of words mastered per day.

### New screen: `AnalyticsScreen.js`

A ScrollView with several chart sections.

**Header stats row.** Four small cards: total words learned, current streak, average accuracy, sessions this week. Reuses the `statCard` style from `HomeScreen`.

**Weekly activity chart.** Bar chart showing words reviewed per day for the last 4 weeks. Uses `react-native-chart-kit` `BarChart`.

**Accuracy trend.** Line chart showing rolling-average accuracy over the last 30 days.

**CEFR level progress.** Horizontal progress bars showing percentage of words mastered per level (A1 through C2). Each bar is a simple `View` with percentage width, no charting library needed.

**Category heatmap.** Grid of category cards colored by accuracy (green = strong, red = weak). Tapping a card navigates to practice that category.

**Review vs. new words.** Stacked bar chart or area chart showing the daily ratio.

**Learning velocity.** Single stat card: "At your current pace, you'll reach B1 in ~N days."

### Navigation

Add `AnalyticsScreen` to `ProgressStack` alongside `AchievementsScreen`. Add a tab or button on the Progress tab. Consider renaming the tab to "Progress" with sub-screens for Achievements and Analytics.

### Backend sync

No backend changes. Analytics are computed from local data. If the user switches devices, their synced progress will regenerate the same analytics.

### Implementation order

1. Install charting library (`react-native-chart-kit` or `victory-native`).
2. Create shared query helpers in `database.js` (if not already done in shared infrastructure).
3. Create `analyticsService.js`.
4. Build `AnalyticsScreen.js` section by section (start with header stats, then add charts incrementally).
5. Wire into `ProgressStack` navigation.

---

## Feature 5: Weak Area Detection

### Service: `mobile/src/services/weakAreaService.js`

```
detectWeakAreas()
```
Returns an array of `{ type, label, accuracy, wordCount, suggestion }` objects sorted by accuracy ascending (weakest first). Types include `cefr_level`, `category`, and `word_type`. The function runs three analyses.

**CEFR level analysis.** Queries `user_word_progress` joined with `words`, grouped by `cefr_level`. Any level with accuracy below 70% and at least 5 words attempted is flagged.

**Category analysis.** Same join grouped by `category`. Categories with accuracy below 70% and at least 3 words attempted are flagged.

**Chronically difficult words.** Words with `times_incorrect >= 3` and accuracy below 50%. These are not a "type" but are included in the results as individual word suggestions.

```
generateWeakAreaSession(weakArea)
```
Takes a weak area object and returns a word list filtered by the weak area's type and label. For `cefr_level` type, fetches words at that level. For `category` type, fetches words in that category. For individual words, returns those specific words. The returned format matches `getWordsDueForReview` output.

```
getWeakAreaSuggestion()
```
Returns the single most impactful weak area as a human-readable string, suitable for display in a banner. Example: "You're struggling with B1 verbs -- practice recommended."

### UI integration

**HomeScreen suggestion banner.** Below the streak display, show a dismissible banner when `getWeakAreaSuggestion()` returns a result. The banner has a "Practice Now" button that navigates to the relevant exercise mode with the weak area filter.

**Analytics integration.** On `AnalyticsScreen` (Feature 4), the category heatmap and CEFR progress bars can highlight weak areas with a warning icon or red border.

**Auto-generated review sessions.** On `ModeSelectionScreen`, add a "Smart Review" card that says "Focus on your weak areas." Tapping it calls `detectWeakAreas()`, picks the top weak area, and starts a session with `generateWeakAreaSession`.

### Scoring algorithm

The weak area score for a group (category or CEFR level) is:

```
score = (1 - accuracy) * log2(wordCount + 1) * recencyWeight
```

`recencyWeight` is higher for words reviewed recently (they should be fresh but are still wrong). Groups are sorted by score descending. This ensures that a category with 50 words at 60% accuracy ranks higher than a category with 3 words at 55% accuracy.

### Implementation order

1. Create `weakAreaService.js` with detection and session generation.
2. Add suggestion banner to `HomeScreen`.
3. Add "Smart Review" card to `ModeSelectionScreen`.
4. Integrate with `AnalyticsScreen` (after Feature 4).

---

## Feature 6: Review Reminders (Smart Notifications)

### Dependencies

Add `expo-notifications` to the project. It handles local scheduled notifications on both iOS and Android without a push notification server.

```bash
npx expo install expo-notifications
```

### New service: `mobile/src/services/notificationService.js`

```
requestPermissions()
```
Requests notification permissions. Returns a boolean. Called from `SettingsScreen` when the user enables reminders.

```
scheduleReviewReminder(settings)
```
Cancels all existing reminders and schedules new ones based on `settings`:
- `preferredTime` -- hour of day (0-23), default 9
- `enabled` -- boolean
- `types` -- array of notification types to include

Schedules a daily repeating notification at the preferred time. The notification body is dynamic and computed at schedule time from a set of templates.

```
updateNotificationContent()
```
Called on app foreground. Computes the count of words due for review today (`SELECT COUNT(*) FROM user_word_progress WHERE next_review_date <= date('now')`), the current streak, and whether the daily challenge is complete. Reschedules the notification with updated content.

```
cancelAllReminders()
```

### Notification content templates

The notification title and body rotate through a small set of messages:

- "N words are due for review today" (where N comes from the due-words query)
- "Keep your N-day streak alive -- 5 min practice"
- "You're close to mastering N words -- review now"
- "Daily challenge waiting for you" (if Feature 3 is implemented and challenge is incomplete)

### Settings integration in `SettingsScreen.js`

Add a new section "Review Reminders" with:
- Toggle switch: enable/disable reminders (persisted to `AsyncStorage` key `reminders_enabled`)
- Time picker: preferred reminder time (persisted to `AsyncStorage` key `reminder_time`)
- Preview text: shows what the next notification will say

When the toggle is turned on, call `requestPermissions()`. If denied, show an alert explaining how to enable notifications in system settings and turn the toggle back off.

When either the toggle or time changes, call `scheduleReviewReminder()` with the new settings.

### Backend sync

Notification preferences are stored locally in `AsyncStorage`. They are device-specific and do not need backend sync. The existing `user_settings` table already has a `notifications_enabled` field in the backend schema; this can be reused if cross-device preference sync is desired later.

### App lifecycle handling

In `App.js`, on app foreground (using `AppState` listener), call `updateNotificationContent()` to keep the scheduled notification content fresh. This ensures the word count in the notification body reflects reality even if the user practiced earlier in the day.

### Implementation order

1. Install `expo-notifications`.
2. Create `notificationService.js` with permission, schedule, and cancel functions.
3. Add "Review Reminders" section to `SettingsScreen.js`.
4. Add `updateNotificationContent()` call in `App.js` foreground handler.
5. Connect notification taps to navigate to the relevant screen (review mode).

---

## Cross-Feature Dependencies

The following diagram shows which features depend on shared infrastructure and on each other.

```
Shared: query helpers ──> Feature 1 (Mistake Journal)
                     ──> Feature 4 (Analytics)
                     ──> Feature 5 (Weak Areas)

Shared: charting lib ──> Feature 4 (Analytics)

Shared: notifications ──> Feature 6 (Reminders)
                      ──> Feature 3 (Daily Challenges, optional)

Feature 5 (Weak Areas) uses Feature 4 (Analytics) data if available
Feature 3 (Daily Challenges) content benefits from Feature 6 (Reminders)
Feature 1 (Mistake Journal) practice mode reuses Feature 2 (Lists) UI pattern
```

## Recommended Build Order

The order below minimizes rework and lets each feature build on prior work.

1. **Shared query helpers** -- required by three features, build first.
2. **Feature 1: Mistake Journal** -- smallest scope, validates the query helpers, delivers immediate user value.
3. **Feature 5: Weak Area Detection** -- builds directly on the same queries, adds the suggestion banner to HomeScreen.
4. **Feature 2: Custom Word Lists** -- independent data model, introduces the list/practice-from-source pattern that other features reuse.
5. **Feature 3: Daily Challenges** -- requires the session completion hook, benefits from the list practice pattern.
6. **Feature 4: Detailed Analytics** -- requires charting library, consumes all the query helpers, best done after the data layer is stable.
7. **Feature 6: Review Reminders** -- independent of all other features but benefits from having Features 3 and 5 data to populate notification content.

## New Files Summary

```
mobile/src/services/
  mistakeJournalService.js          Feature 1
  wordListService.js                Feature 2
  dailyChallengeService.js          Feature 3
  analyticsService.js               Feature 4
  weakAreaService.js                Feature 5
  notificationService.js            Feature 6 (shared with 3)

mobile/src/screens/
  MistakeJournalScreen.js           Feature 1
  WordListsScreen.js                Feature 2
  WordListDetailScreen.js           Feature 2
  AnalyticsScreen.js                Feature 4
```

## Modified Files Summary

```
mobile/src/services/database.js     Shared query helpers, new table creation,
                                    challenge progress hook in completeSession
mobile/src/screens/HomeScreen.js    Mistake Journal card, Daily Challenge card,
                                    Weak Area suggestion banner
mobile/src/screens/LearningScreen.js
                                    Handle source='mistakes'|'list'|'weakArea'
mobile/src/screens/ModeSelectionScreen.js
                                    "Smart Review" card (Feature 5)
mobile/src/screens/SettingsScreen.js
                                    Reminder settings section (Feature 6)
mobile/src/screens/SummaryScreen.js "Save to list" prompt (Feature 2)
mobile/src/navigation/MainTabs.js   New screens in stacks
mobile/App.js                       Foreground notification refresh (Feature 6)
mobile/src/services/achievementDatabase.js
                                    New challenge-related achievements (Feature 3)
mobile/src/services/AchievementService.js
                                    Check challenge achievements (Feature 3)
```

## New Dependencies

| Package | Feature | Purpose |
|---------|---------|---------|
| `react-native-chart-kit` or `victory-native` | 4 | Charts on Analytics screen |
| `react-native-svg` | 4 | Required peer dependency for charting |
| `expo-notifications` | 6 | Local scheduled notifications |

## Database Schema Changes (SQLite)

| Table | Feature | Purpose |
|-------|---------|---------|
| `word_lists` | 2 | User-created word lists |
| `word_list_items` | 2 | Words belonging to each list |
| `daily_challenges` | 3 | Daily challenge state |
| `challenge_streaks` | 3 | Challenge completion streak |

No new PostgreSQL tables are required for MVP. Backend sync extensions for word lists and daily challenges can be added incrementally.
