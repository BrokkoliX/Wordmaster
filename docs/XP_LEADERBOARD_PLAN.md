# XP & Leaderboard System — Technical Plan

## Table of Contents
1. [Overview & Goals](#1-overview--goals)
2. [Core Design Principles](#2-core-design-principles)
3. [XP System Design](#3-xp-system-design)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Layer](#5-database-layer)
6. [Backend Layer](#6-backend-layer)
7. [Mobile Sync Layer](#7-mobile-sync-layer)
8. [Mobile UI Layer](#8-mobile-ui-layer)
9. [Integration Points with Existing Code](#9-integration-points-with-existing-code)
10. [Leaderboard Scopes & Rules](#10-leaderboard-scopes--rules)
11. [Anti-Cheat & Data Integrity](#11-anti-cheat--data-integrity)
12. [Subscription Tier Gating](#12-subscription-tier-gating)
13. [Build Order & Phases](#13-build-order--phases)
14. [Future Extensions](#14-future-extensions)

---

## 1. Overview & Goals

### What We Are Building
A **server-authoritative XP (experience points) system** that aggregates player activity into a single comparable score, exposed through two leaderboard scopes: **global** (all users) and **friends** (followed users only).

### Why This Direction
- Every existing user benefits immediately — no opt-in required
- The follow system (`follow.model.js`, `followService.js`) already provides the social graph needed for a friends leaderboard
- Achievement points already exist locally (`achievementDatabase.js`) but have no cross-user visibility — this plan surfaces them on the server
- The progress sync pipeline (`progressSyncService.js` → `POST /api/progress/sync`) provides a proven, battle-tested channel to push new XP events to the backend
- It gives the follow system a concrete reason to exist (currently there is nothing to do with followers once you have them)

### Goals
- A single **XP score** per user that reflects all meaningful learning activity
- **Two leaderboard scopes**: global (top N users) and friends (your follow graph)
- **Extensible scoring rules** — adding or tweaking XP sources should never require schema changes
- **Offline-first**: XP accrues locally and syncs when online, consistent with the rest of the app
- **Tamper-resistant**: the backend validates and owns the canonical XP total

---

## 2. Core Design Principles

### 2.1 Server Is the Source of Truth
Local SQLite stores a pending XP queue. The backend PostgreSQL owns the canonical `total_xp` per user. The leaderboard always reads from the backend.

### 2.2 Event-Driven XP, Not Computed XP
XP is awarded via discrete **XP events** (e.g. `session_completed`, `word_mastered`, `achievement_unlocked`), not recomputed from raw stats on every request. This means:
- Historical XP is preserved even if scoring rules change later
- Each event type can be adjusted, added, or deprecated independently
- The audit log is trivially available (the events table itself)

### 2.3 Rule Table, Not Hardcoded Values
XP award amounts are stored in a `xp_rules` database table, not hardcoded in application code. Changing a reward value is an `UPDATE` query, not a deployment.

### 2.4 Delta Sync
Only unsent XP events leave the device. The same delta-sync pattern used by `progressSyncService.js` is reused here — piggyback onto the existing `POST /api/progress/sync` payload.

---

## 3. XP System Design

### 3.1 XP Event Sources

| Event Type | Trigger | Base XP | Notes |
|---|---|---|---|
| `session_completed` | Any session finished | 10 | Always awarded |
| `word_mastered` | Word status → `mastered` | 5 | Per word, one-time |
| `perfect_session` | 100% accuracy, ≥20 words | 25 | Bonus on top of `session_completed` |
| `daily_streak_maintained` | Streak incremented | 5 | Per day |
| `streak_milestone` | Streak hits 7/30/100/365 | 50/200/500/2000 | One-time per milestone |
| `achievement_unlocked` | Any achievement fires | achievement's `points` value | Maps directly to existing points |
| `daily_challenge_completed` | Daily challenge finished | 30 | Once per day |
| `words_reviewed` | Words shown in session | 1 per word | Caps at 50/session to prevent grinding |
| `cefr_level_advanced` | User advances CEFR level | 100 | One-time per level |
| `language_added` | New language pair started | 50 | One-time per pair |

> **Extensibility note:** New event types are added to the `xp_rules` table only. The processing pipeline handles them automatically via the `event_type` lookup. No code change needed for new event types once the system is live.

### 3.2 XP Multipliers (Future-Ready Slots)
The `xp_events` table includes a `multiplier` column (default `1.0`) reserved for future use:
- Weekend boost (`1.5x`)
- Streak shield bonus (`1.2x`)
- Subscription tier bonus (`1.1x` for Plus, `1.25x` for Super)
- Seasonal events

Multipliers are applied server-side at processing time, keeping the client logic simple.

### 3.3 Leaderboard Score
```
leaderboard_score = SUM(base_xp * multiplier) for all accepted xp_events
```

This is materialised into `user_xp.total_xp` via a server-side upsert each time new events arrive, so leaderboard queries are a fast indexed scan, not an aggregation.

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile (React Native)                │
│                                                         │
│  AchievementService  ──┐                                │
│  LearningScreen      ──┤──► xpService.js               │
│  SummaryScreen       ──┤    (queues events in SQLite)   │
│  dailyChallengeService─┘         │                      │
│                                  │ piggybacks on         │
│                          progressSyncService.js         │
└──────────────────────────────────┼──────────────────────┘
                                   │ POST /api/progress/sync
                                   ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Express/PostgreSQL)           │
│                                                         │
│  progress.controller.js                                 │
│    └── accepts xpEvents[] in sync payload               │
│                                                         │
│  xp.model.js                                            │
│    ├── processEvents(userId, events[])                  │
│    │     validates against xp_rules table               │
│    │     inserts into xp_events                         │
│    │     upserts user_xp.total_xp                       │
│    └── getLeaderboard(scope, userId, limit)             │
│                                                         │
│  leaderboard.routes.js                                  │
│    GET /api/leaderboard/global                          │
│    GET /api/leaderboard/friends                         │
│    GET /api/leaderboard/me                              │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Database Layer

### 5.1 New Tables (PostgreSQL)

#### `xp_rules` — Scoring configuration table
```sql
CREATE TABLE xp_rules (
  event_type      TEXT PRIMARY KEY,
  base_xp         INTEGER NOT NULL DEFAULT 0,
  is_repeatable   BOOLEAN NOT NULL DEFAULT TRUE,
  daily_cap       INTEGER,          -- NULL = no cap
  total_cap       INTEGER,          -- NULL = no cap (e.g. word_mastered is one-time per word)
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

Seed data mirrors the table in §3.1. Changing `base_xp` here instantly affects all future events.

#### `xp_events` — Immutable event ledger
```sql
CREATE TABLE xp_events (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL REFERENCES xp_rules(event_type),
  reference_id    TEXT,             -- e.g. word_id, achievement_id, session_id
  base_xp         INTEGER NOT NULL,
  multiplier      REAL NOT NULL DEFAULT 1.0,
  awarded_xp      INTEGER NOT NULL, -- base_xp * multiplier, rounded
  occurred_at     TIMESTAMPTZ NOT NULL, -- client-reported time
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_events_user_id    ON xp_events(user_id);
CREATE INDEX idx_xp_events_event_type ON xp_events(event_type);
CREATE INDEX idx_xp_events_occurred   ON xp_events(occurred_at);
-- Prevents duplicate syncs for one-time events
CREATE UNIQUE INDEX idx_xp_events_user_ref
  ON xp_events(user_id, event_type, reference_id)
  WHERE reference_id IS NOT NULL;
```

#### `user_xp` — Materialised totals for fast leaderboard reads
```sql
CREATE TABLE user_xp (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp        INTEGER NOT NULL DEFAULT 0,
  weekly_xp       INTEGER NOT NULL DEFAULT 0,  -- reset every Monday via cron
  monthly_xp      INTEGER NOT NULL DEFAULT 0,  -- reset 1st of month via cron
  last_event_at   TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_xp_total   ON user_xp(total_xp DESC);
CREATE INDEX idx_user_xp_weekly  ON user_xp(weekly_xp DESC);
CREATE INDEX idx_user_xp_monthly ON user_xp(monthly_xp DESC);
```

> **Weekly/monthly XP** are reserved for future time-boxed leaderboard scopes (see §14). They are populated from day one so data is available when those features are built.

### 5.2 Migration Script Location
```
backend/src/scripts/migrations/
  add_xp_system.sql     ← creates all three tables + indexes + seeds xp_rules
```

---

## 6. Backend Layer

### 6.1 New Files

```
backend/src/
  models/
    xp.model.js               ← XP processing and leaderboard queries
  controllers/
    leaderboard.controller.js ← HTTP handlers
  routes/
    leaderboard.routes.js     ← Route definitions
```

### 6.2 `xp.model.js` — Key Methods

```js
// Process a batch of XP events from a sync payload.
// Validates against xp_rules, deduplicates one-time events, inserts
// into xp_events, and upserts user_xp totals in a single transaction.
static async processEvents(userId, events)

// Return the top N users globally with their rank, username, avatar, total_xp.
// scope: 'global' | 'weekly' | 'monthly'
static async getGlobalLeaderboard(scope, limit, offset)

// Return leaderboard restricted to users that `userId` follows (accepted only).
// Joins user_follows → user_xp → users.
static async getFriendsLeaderboard(userId, scope, limit)

// Return the requesting user's own rank within a given scope.
static async getUserRank(userId, scope)
```

### 6.3 `leaderboard.routes.js` — Endpoints

```
GET  /api/leaderboard/global
     ?scope=all_time|weekly|monthly   (default: all_time)
     ?limit=50&offset=0
     Auth: required
     Returns: [{ rank, userId, username, avatarUrl, totalXp, weeklyXp }]

GET  /api/leaderboard/friends
     ?scope=all_time|weekly|monthly
     Auth: required
     Returns: [{ rank, userId, username, avatarUrl, totalXp }]
             (rank is position within friends list, not global rank)

GET  /api/leaderboard/me
     ?scope=all_time|weekly|monthly
     Auth: required
     Returns: { globalRank, friendsRank, totalXp, weeklyXp, monthlyXp }
```

### 6.4 Extending `POST /api/progress/sync`
The existing sync endpoint in `progress.controller.js` already accepts `progress`, `sessions`, `achievements`, and `settings`. We add one more field:

```js
// In progress.controller.js → syncProgress()
const { progress, sessions, achievements, settings, xpEvents } = req.body;

if (xpEvents && Array.isArray(xpEvents)) {
  results.xpProcessed = await XpModel.processEvents(req.user.id, xpEvents);
}
```

No route change needed. No new endpoint needed. The existing sync contract is preserved.

### 6.5 Rate Limiting
Leaderboard endpoints share the existing `globalLimiter` from `server.js`. If needed in the future, a dedicated `leaderboardLimiter` can be registered the same way other limiters are defined.

---

## 7. Mobile Sync Layer

### 7.1 New File: `mobile/src/services/xpService.js`

Responsibilities:
- Exposes `awardXp(eventType, referenceId, occurredAt)` — the single call-site for awarding XP anywhere in the app
- Writes pending events to a local SQLite table `xp_event_queue`
- Exposes `flushQueue()` — called by `progressSyncService.js` to drain the queue into the sync payload
- Exposes `getLocalTotal()` — reads local running total for optimistic UI display (no server round-trip needed on the achievements/profile screen)

### 7.2 New Local SQLite Table: `xp_event_queue`
```sql
CREATE TABLE IF NOT EXISTS xp_event_queue (
  id           TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  reference_id TEXT,
  occurred_at  TEXT NOT NULL,
  synced       INTEGER DEFAULT 0   -- 0 = pending, 1 = sent
);
```

### 7.3 Extending `progressSyncService.js`
```js
// In syncProgressToServer(), before the api.post call:
const pendingXpEvents = await xpService.flushQueue();

await api.post('/progress/sync', {
  progress,
  xpEvents: pendingXpEvents,   // ← new field
});
```

This keeps XP sync invisible to all other consumers — they continue calling `syncProgressToServer()` without change.

### 7.4 Call Sites — Where `xpService.awardXp()` Is Called

| Location | Event | Reference ID |
|---|---|---|
| `SummaryScreen.js` — on mount | `session_completed` | `sessionId` |
| `SummaryScreen.js` — on mount, if accuracy === 100 | `perfect_session` | `sessionId` |
| `AchievementService.js` — inside `unlockAchievement()` | `achievement_unlocked` | `achievementId` |
| `AchievementService.js` — inside `checkAllAchievements()` | `word_mastered` | `wordId` (per newly mastered) |
| `streakService.js` — on streak increment | `daily_streak_maintained` | `date` string |
| `streakService.js` — on milestone | `streak_milestone` | `streakValue` |
| `dailyChallengeService.js` — on completion | `daily_challenge_completed` | `challengeId` |
| `ModeSelectionScreen.js` — on new language pair | `language_added` | `sourceLang-targetLang` |

Each call is a single line addition at an already-existing event boundary. No screen-level refactoring required.

---

## 8. Mobile UI Layer

### 8.1 New Screen: `LeaderboardScreen.js`

**Tab placement:** Added to the existing `ProgressStack` in `MainTabs.js`, accessible from `AchievementsScreen` via a header button or tab pill. Does not require a new bottom tab (the tab bar is already at four items, adding a fifth would crowd it).

**Layout:**
```
┌─────────────────────────────────┐
│  🏆 Leaderboard                 │
│  [All Time] [Weekly] [Monthly]  │  ← scope toggle
│  [Global]   [Friends]           │  ← audience toggle
├─────────────────────────────────┤
│  Your rank: #142   12,540 XP    │  ← sticky user card
├─────────────────────────────────┤
│  🥇 1. wordmaster_alice  45,200 │
│  🥈 2. roberto92         38,100 │
│  🥉 3. learnwithSue      31,500 │
│     4. ...                      │
│    ──── you are here ────       │
│   142. you             12,540   │  ← highlighted row
│   143. ...                      │
└─────────────────────────────────┘
```

Key behaviours:
- **Optimistic local XP total** shown in the user card (from `xpService.getLocalTotal()`) without waiting for leaderboard API
- **Pull-to-refresh** triggers a progress sync then re-fetches leaderboard
- **Friends tab** shows a prompt to find people if the follow list is empty (links to existing Profile/Search)
- **Pagination** via infinite scroll (`offset`-based, matching the backend `?offset=` param)

### 8.2 Changes to Existing Screens

#### `AchievementsScreen.js`
- Add a **"Leaderboard →"** button in the header, navigating to `LeaderboardScreen`
- The existing `stats.totalPoints` display can be labelled "XP" instead of "Points" for consistency

#### `HomeScreen.js`
- Add a small **XP widget** to the dashboard stats row (alongside the existing streak, words learned cards)
- Data source: `xpService.getLocalTotal()` — no API call, instant render

#### `ProfileScreen.js`
- Add user's **global rank** below their username when viewing own profile
- Data source: `GET /api/leaderboard/me`

### 8.3 New Service File: `mobile/src/services/leaderboardService.js`
Thin wrapper over the API, following the exact same `{ data, error }` pattern established by `followService.js`:

```js
class LeaderboardService {
  async getGlobal(scope = 'all_time', limit = 50, offset = 0)
  async getFriends(scope = 'all_time')
  async getMyRank(scope = 'all_time')
}
```

---

## 9. Integration Points with Existing Code

| Existing System | Change Required | Risk |
|---|---|---|
| `progressSyncService.js` | Add `xpEvents` to sync payload | Low — additive only |
| `progress.controller.js` | Read `xpEvents` from body, call `XpModel.processEvents` | Low — existing fields unchanged |
| `AchievementService.js` | Call `xpService.awardXp()` inside `unlockAchievement()` | Low — single line addition |
| `SummaryScreen.js` | Call `xpService.awardXp()` on session complete | Low — already a natural event boundary |
| `streakService.js` | Call `xpService.awardXp()` on streak increment | Low |
| `MainTabs.js` | Add `LeaderboardScreen` to `ProgressStack` | Low |
| `follow.model.js` | No change — used as-is by `getFriendsLeaderboard()` | None |
| `subscription.model.js` | No change — tier checked via `req.user.subscription_tier` | None |
| `auth.middleware.js` | No change — leaderboard routes use existing `authenticate` | None |

---

## 10. Leaderboard Scopes & Rules

### Scope Matrix

| Scope | Data Source | Reset Cadence | Available To |
|---|---|---|---|
| All Time | `user_xp.total_xp` | Never | All authenticated users |
| Weekly | `user_xp.weekly_xp` | Every Monday 00:00 UTC | All authenticated users |
| Monthly | `user_xp.monthly_xp` | 1st of month 00:00 UTC | All authenticated users |

### Audience Matrix

| Audience | Query Logic | Requires Follow System |
|---|---|---|
| Global | Top N from `user_xp` ordered by scope score | No |
| Friends | `user_xp` WHERE `user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $me AND status = 'accepted')` + self | Yes |

### Weekly/Monthly Reset
A scheduled job (PM2 cron task on the existing EC2 instance) runs:
```sql
-- Every Monday
UPDATE user_xp SET weekly_xp = 0, updated_at = NOW();

-- Every 1st of month
UPDATE user_xp SET monthly_xp = 0, updated_at = NOW();
```

Resets are logged to a `xp_reset_log` table for audit purposes.

### Tie-Breaking
When two users share the same XP: order by `last_event_at ASC` (earlier achiever ranks higher). This is deterministic and rewards earlier adopters.

---

## 11. Anti-Cheat & Data Integrity

### 11.1 Server-Side Validation in `XpModel.processEvents()`

1. **Rule existence check** — reject any `event_type` not present in `xp_rules`
2. **Active flag check** — reject events for rules where `is_active = FALSE`
3. **One-time deduplication** — the `UNIQUE INDEX` on `(user_id, event_type, reference_id)` in `xp_events` silently discards duplicate one-time events (e.g. `word_mastered` for the same `word_id` twice)
4. **Repeatable daily cap** — for events with a `daily_cap`, count events of that type for the user on `occurred_at`'s date; reject if cap exceeded
5. **Timestamp sanity** — reject events where `occurred_at` is in the future (> `NOW() + 5 minutes` tolerance) or more than 30 days in the past
6. **Batch size cap** — a single sync payload may contain at most 500 XP events; excess is rejected with a `400` and a descriptive error code

### 11.2 Base XP Is Server-Authoritative
The client sends `event_type` and `reference_id`. It does **not** send a claimed XP amount. The backend looks up `base_xp` from `xp_rules` and applies any multiplier itself. A tampered client payload cannot inflate scores.

### 11.3 Rate Limiting
The existing `globalLimiter` (100 req / 15 min) protects the sync endpoint. No additional limiter needed for the initial release.

---

## 12. Subscription Tier Gating

| Feature | Free | Plus | Super |
|---|---|---|---|
| Earn XP | ✅ | ✅ | ✅ |
| View global leaderboard (top 50) | ✅ | ✅ | ✅ |
| View friends leaderboard | ✅ | ✅ | ✅ |
| View own global rank | ✅ | ✅ | ✅ |
| Weekly leaderboard | ❌ | ✅ | ✅ |
| Monthly leaderboard | ❌ | ✅ | ✅ |
| XP multiplier bonus | ❌ | 1.1x | 1.25x |
| Full leaderboard (top 500) | ❌ | ❌ | ✅ |

Tier is available on every authenticated request via `req.user.subscription_tier` (embedded in JWT at login — see `auth.middleware.js`). No extra DB query required.

---

## 13. Build Order & Phases

### Phase 1 — Foundation (Backend + Sync) ✦ Core
Deliverables: XP events flow from client to server and total_xp is maintained correctly.

1. Write and run `add_xp_system.sql` migration (§5.1)
2. Implement `xp.model.js` — `processEvents()` + `getUserRank()` only
3. Extend `progress.controller.js` to accept `xpEvents[]` (§6.4)
4. Implement `xpService.js` on mobile — local queue + `awardXp()` + `flushQueue()` (§7.1)
5. Create `xp_event_queue` SQLite table in the mobile DB init script
6. Extend `progressSyncService.js` to drain queue on sync (§7.3)
7. Add `xpService.awardXp()` call sites in `SummaryScreen`, `AchievementService`, `streakService`, `dailyChallengeService` (§7.4)

**Exit criteria:** After completing a session, total_xp in `user_xp` on the backend increases correctly for authenticated users.

---

### Phase 2 — Leaderboard API ✦ Core
Deliverables: Leaderboard endpoints are live and return correct ranked data.

1. Implement `xp.model.js` — `getGlobalLeaderboard()` + `getFriendsLeaderboard()` (§6.2)
2. Implement `leaderboard.controller.js`
3. Implement `leaderboard.routes.js` and register in `server.js` (§6.3)
4. Implement `leaderboardService.js` on mobile (§8.3)

**Exit criteria:** `GET /api/leaderboard/global` returns a correctly ordered list; `GET /api/leaderboard/friends` correctly scopes to the follow graph.

---

### Phase 3 — Mobile UI ✦ Core
Deliverables: Users can see and interact with leaderboards in the app.

1. Implement `LeaderboardScreen.js` (§8.1)
2. Register screen in `MainTabs.js` → `ProgressStack`
3. Add XP widget to `HomeScreen.js` dashboard (§8.2)
4. Add leaderboard navigation button to `AchievementsScreen.js`
5. Add global rank display to `ProfileScreen.js`

**Exit criteria:** A user can open the app, complete a session, sync, and see their position on the global and friends leaderboards.

---

### Phase 4 — Time-Boxed Leaderboards ✦ Enhancement
Deliverables: Weekly and Monthly scopes go live.

1. Add PM2 cron job for weekly/monthly reset (§10)
2. Create `xp_reset_log` table
3. Expose weekly/monthly scopes in the leaderboard API (add `?scope=` param handling)
4. Add scope toggle to `LeaderboardScreen.js`
5. Gate weekly/monthly behind `plus`/`super` tiers (§12)

---

### Phase 5 — XP Multipliers ✦ Enhancement
Deliverables: Subscription tier XP bonuses are live.

1. Add multiplier lookup in `XpModel.processEvents()` based on `req.user.subscription_tier`
2. Display active multiplier badge in `LeaderboardScreen` user card

---

## 14. Future Extensions

The system is designed so every item below is additive — no schema or API breaking changes required.

| Extension | What It Needs |
|---|---|
| **Seasonal / event leaderboards** | New `scope` value + temporary `xp_season_YYYY_MM` column on `user_xp`; the model method signature already accepts `scope` as a parameter |
| **Language-pair leaderboards** | Add `language_pair` column to `xp_events`; `getGlobalLeaderboard()` gains an optional `?lang=en-es` filter |
| **Weekly challenge winner badge** | Query top-1 of weekly leaderboard after reset; write to a `xp_honors` table; surface as a profile badge |
| **XP decay / prestige system** | Add a `prestige_level` column to `user_xp`; decay `total_xp` on prestige and restart — leaderboard can toggle between prestige and raw score |
| **Classroom / group leaderboards** | Add a `group_id` foreign key to `xp_events`; `getGroupLeaderboard(groupId)` is a minor variant of `getFriendsLeaderboard()` — the teacher/classroom plan from earlier slots cleanly on top |
| **Streak-protected XP** | Add `is_protected` flag to `xp_events`; a streak-shield item prevents decay of streak milestone XP |
| **Push notification on rank change** | A background job compares yesterday's rank vs today's; uses the existing `notificationService.js` to fire a push |
| **Admin XP management** | The existing admin panel can expose `xp_rules` as an editable table — no new backend model needed, just a new admin route that reads/writes `xp_rules` |
