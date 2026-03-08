# Wordmaster Scalability Roadmap

## Architecture

Wordmaster is **local-first**. All learning logic (SM-2 spaced repetition, word selection, sessions) runs in SQLite on the user's phone. The Express/PostgreSQL backend serves the word dictionary (downloaded once) and stores user accounts. Adding users does not increase backend load for the core learning flow.

---

## Done (already implemented)

### 1. Rate limiting

`backend/src/server.js` now has three tiers of rate limiting via `express-rate-limit`. A global limit of 100 requests per 15 minutes applies to all routes. Auth routes (`/api/auth`) are capped at 10 requests per 15 minutes to prevent brute-force attacks. Admin routes (`/api/admin`) are capped at 30 requests per 15 minutes to protect the SQL query endpoint.

### 2. Production log silencing

`backend/src/config/database.js` no longer logs every SQL statement in production. The per-query `console.log` is gated behind `NODE_ENV !== 'production'`. The HTTP request logger (`morgan`) in `server.js` is also gated the same way.

### 3. In-session retry queue

`mobile/src/screens/LearningScreen.js` now re-queues words the user gets wrong. Missed words are appended to the end of the session and re-presented until the user answers them correctly 2 times within that session (`REQUIRED_CORRECT_TO_PASS = 2`). The progress bar and summary stats use the original session size so they are not inflated by retries.

### 4. New/review word ratio

`LearningScreen.js` now reserves at least 30% of each session for unseen words (`REVIEW_RATIO = 0.7`). Previously, due-for-review words could fill the entire session, starving new vocabulary. Now the user always encounters fresh words as long as unseen words remain in the pool.

### 5. Progress sync to backend

`mobile/src/services/progressSyncService.js` is a new service that pushes local progress to the backend after each session. It uses **delta sync**: only records changed since the last successful sync are sent. The sync runs in the background (fire-and-forget from `completeSession` in `database.js`) and silently retries on the next session if it fails. The service also supports pulling progress from the server for device restoration via `pullProgressFromServer()`.

### 6. Batch upsert on the backend

`backend/src/models/progress.model.js` was rewritten to use a single `INSERT ... SELECT unnest()` query instead of a row-by-row loop. Syncing 500 words now takes 1 database query instead of 500, reducing connection hold time from seconds to milliseconds.

---

## Still To Do

### Before 10k users

**Add database indexes.** The admin dashboard runs correlated subqueries per user against `user_word_progress` with no index. Run this migration:

```sql
CREATE INDEX IF NOT EXISTS idx_uwp_user_id ON user_word_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_uwp_user_word ON user_word_progress(user_id, word_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON learning_sessions(user_id, start_time);
```

**Cache the word catalog.** `GET /api/words` hits PostgreSQL on every request even though the data rarely changes. Add `apicache` or `node-cache` with a 1-hour TTL, invalidated when the admin imports words. Alternatively, serve pre-built JSON from S3/CloudFront (the upload script already exists at `mobile/scripts/uploadToAWS.js`).

**Make the DB pool configurable.** The pool is hardcoded to 20 connections in `backend/src/config/database.js`. Read `DB_POOL_MAX` from the environment instead.

**Fix refresh token validation.** `POST /auth/refresh-token` verifies the JWT signature but never checks the `refresh_tokens` table. `POST /auth/logout` deletes from that table, but the deletion has no effect because refresh is never checked. Add a lookup on refresh so logout actually invalidates tokens.

**Restrict the admin SQL endpoint.** `POST /api/admin/database/query` allows arbitrary SELECT statements. The regex-based blocking is bypassable. In production, this endpoint should either be removed or gated behind VPN/IP allowlist.

### Before 100k users

**Add a load balancer.** The Express server is already stateless (JWT, no in-process state). Put 2+ instances behind an ALB. The only requirement is shared PostgreSQL and JWT secrets.

**Add a read replica.** Route admin/analytics queries to a PostgreSQL read replica so expensive dashboard queries don't compete with user-facing sync writes.

**CDN for word data.** Instead of hitting the API for `GET /api/words`, serve pre-generated per-language-pair JSON packs from CloudFront. The mobile app already has bundled JSON fallback for offline use.

### Long-term (100k+ users)

**Partition the progress table.** `user_word_progress` grows as users x words-reviewed. When it exceeds ~50M rows, partition by `user_id` hash.

**Consider FSRS.** SM-2 (1987) has known issues like ease-factor drift. FSRS (used by modern Anki) produces better retention with fewer reviews. This is a significant rewrite of `updateWordProgress()` in `mobile/src/services/database.js` and should only be done once the above items are in place and you have enough usage data to validate the improvement.
