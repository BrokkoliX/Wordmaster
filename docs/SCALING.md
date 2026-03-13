# Backend Architecture and Scaling

This document covers the current architecture, what it handles well, what will break first, and the roadmap for scaling.

---

## Current Architecture

The backend is a single Node.js/Express process running on one EC2 instance, backed by a single PostgreSQL database on the same machine. All domain concerns -- auth, words, sentences, progress, follow, subscriptions, admin -- live in one process sharing one connection pool of 20 connections. This is a **modular monolith**: the code is organized into separate controllers, models, and routes by domain, but everything deploys and runs as one unit.

Wordmaster is **local-first**. All learning logic (SM-2 spaced repetition, word selection, sessions) runs in SQLite on the user's phone. The backend serves the word dictionary (downloaded once) and stores user accounts. Adding users does not increase backend load for the core learning flow. The dominant request type in production is `POST /api/progress/sync`, which fires once per session -- roughly one request per 20 minutes of learning per user.

## Is Microservices the Right Answer?

No -- not at this stage, and not even at a million users for this type of application. Microservices solve organizational problems (many teams, independent deployments) more than raw traffic problems. The overhead they introduce -- network hops, distributed transactions, service discovery, separate deployment pipelines -- is real cost. Companies like Stack Overflow and Basecamp have served tens of millions of users from a monolith. Duolingo ran on a monolith until well past 100 million users before selectively extracting services.

---

## What Has Already Been Done

**Rate limiting.** `server.js` has three tiers via `express-rate-limit`: 100 req/15 min globally, 10 req/15 min for auth routes, 30 req/15 min for admin routes.

**Production log silencing.** `database.js` no longer logs every SQL statement in production. The per-query log and the HTTP request logger (`morgan`) are both gated behind `NODE_ENV !== 'production'`.

**In-session retry queue.** `LearningScreen.js` re-queues missed words until the user answers them correctly 2 times within the session (`REQUIRED_CORRECT_TO_PASS = 2`). The progress bar uses the original session size so it is not inflated by retries.

**New/review word ratio.** `LearningScreen.js` reserves at least 30% of each session for unseen words (`REVIEW_RATIO = 0.7`).

**Progress delta sync.** `progressSyncService.js` pushes only records changed since the last successful sync. The sync runs fire-and-forget after `completeSession` and silently retries on the next session if it fails. It also supports pulling progress for device restoration.

**Batch upsert.** `progress.model.js` uses a single `INSERT ... SELECT unnest()` query instead of a row-by-row loop, reducing connection hold time from seconds to milliseconds.

---

## What Will Break First

### 1. Database Connection Pool (~500 concurrent users)

The pool is capped at 20 connections. With 500 concurrent active users each holding a request, the pool exhausts and requests queue.

Fix: **PgBouncer** between Node and Postgres. This multiplexes thousands of application connections onto a small number of real database connections. No code changes required.

```
Node (pool: 20) -> PgBouncer (pool: 100) -> PostgreSQL
```

### 2. Single Process (~2,000-5,000 concurrent users)

Node.js is single-threaded. One process saturates one CPU core.

Fix: **PM2 cluster mode** -- one line change in `ecosystem.config.js`:

```js
instances: 'max',
exec_mode: 'cluster',
```

One thing to verify first: the rate limiters use in-memory storage, so each process holds its own counter. Under cluster mode a user could send `instances * max` requests before hitting the limit. Back the rate limiter with Redis:

```js
const RedisStore = require('rate-limit-redis');
// Pass store: new RedisStore({ client: redisClient }) to each rateLimit() call
```

### 3. Single Machine (~10,000+ concurrent users)

Fix: vertical scaling first (larger instance type), then horizontal scaling with multiple instances behind an ALB. This requires moving PostgreSQL to RDS, moving rate-limit state to ElastiCache (Redis), and putting an Application Load Balancer in front.

### 4. `/api/words` Endpoint

Words are static data. Every call for the same language pair and level returns the same response. These could be cached at the Nginx layer or served via CloudFront.

---

## Specific Issues to Fix Before Scaling

**`getStats` runs 4 sequential queries per request.** The streak calculation is a recursive CTE that scans all sessions. Pre-compute these on a schedule into a `user_stats` table updated at session completion.

**`progress.controller.js` loops over sessions and achievements row-by-row in `syncProgress`.** Word progress uses `UNNEST` correctly, but sessions and achievements are inserted one at a time. Use the same batch-upsert pattern.

**No database indexes in the repository.** At minimum:

```sql
CREATE INDEX IF NOT EXISTS idx_uwp_user_id ON user_word_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_uwp_user_word ON user_word_progress(user_id, word_id);
CREATE INDEX IF NOT EXISTS idx_uwp_next_review ON user_word_progress(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_ls_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ls_start_time ON learning_sessions(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_words_lang_level ON words(source_lang, target_lang, cefr_level);
CREATE INDEX IF NOT EXISTS idx_words_freq ON words(source_lang, target_lang, frequency_rank);
```

**DB pool is hardcoded.** The pool max of 20 in `database.js` should read from `DB_POOL_MAX` in the environment.

---

## Scaling Roadmap

| Stage | Users | Action | Effort |
|---|---|---|---|
| Now | < 500 | Current setup -- no changes needed | -- |
| Soon | ~500-2k | Add PgBouncer; move DB to RDS | Low |
| Growing | ~2k-10k | PM2 cluster mode; Redis for rate limiting | Low |
| Scaling | ~10k-500k | ALB + multiple EC2; RDS read replica | Medium |
| Large | ~500k-1M+ | CloudFront CDN for word responses; pre-computed stats | Medium |
| Long-term | 100k+ rows in progress | Partition `user_word_progress` by `user_id` hash | Medium |
| Future | When data supports it | Evaluate FSRS over SM-2 for better retention scheduling | High |
