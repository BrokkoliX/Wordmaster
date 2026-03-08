# Backend Architecture — Scaling Assessment

## What the Current Architecture Is

The backend is a single Node.js/Express process running on one EC2 instance, backed by a single PostgreSQL database on the same machine. All domain concerns — auth, words, sentences, progress, follow, subscriptions, admin — live in one process sharing one connection pool of 20 connections.

This pattern is called a **modular monolith**: the code is organized into separate controllers, models, and routes by domain, but everything deploys and runs as one unit.

## Is Microservices the Right Answer?

No — not at this stage, and not even at a million users for this type of application.

Microservices solve organizational problems (many teams, many deployments, independent scaling of wildly different workloads) more than they solve raw traffic problems. The overhead they introduce — network hops between services, distributed transactions, service discovery, separate deployment pipelines, harder debugging — is very real cost. Companies like Stack Overflow and Basecamp have served tens of millions of users from a monolith. Duolingo ran on a monolith until well past 100 million users before selectively extracting services.

The correct question is not "monolith or microservices" but "what are the actual bottlenecks, and how do I address them one at a time."

---

## What the Current Architecture Handles Well

**The code structure is already genuinely good.** The separation of routes → controllers → models is clean and consistent across every domain. Each model talks to the database through a shared pool rather than opening raw connections. The `UNNEST`-based batch upsert in `ProgressModel.syncWordProgress` is the right approach — it replaces a row-by-row loop with a single query. JWT auth embeds the subscription tier so `checkFeature` never hits the database per request. These are not beginner patterns — they will carry the application a long way.

**The read load is already offloaded to the client.** Words and sentences are synced to the mobile device's local SQLite database on first launch and re-synced only when the language or level changes. This means `/api/words` and `/api/sentences` are called rarely per user, not on every learning action. The dominant request type in production will be `/api/progress/sync`, which is a single authenticated POST per session — roughly one request per 20 minutes of learning per user.

---

## What Will Break First and How to Fix It

The bottlenecks will arrive in this order, and each has a straightforward solution that does not require splitting the application apart.

### 1. The Database Connection Pool (first bottleneck, ~500 concurrent users)

The pool is capped at 20 connections. PostgreSQL handles ~100 connections comfortably before connection overhead becomes significant. With 500 concurrent active users each holding a request, the pool exhausts and requests queue.

The fix is **PgBouncer** — a connection pooler that sits between the Node process and Postgres and multiplexes thousands of application connections onto a small number of real database connections. This is a single configuration change and requires no code changes.

```
Node (pool: 20) → PgBouncer (pool: 100) → PostgreSQL
```

This alone takes the ceiling from ~500 concurrent users to several thousand.

### 2. The Single Process (next bottleneck, ~2,000–5,000 concurrent users)

Node.js is single-threaded. One process saturates one CPU core. The machine has more cores available.

The fix is **PM2 cluster mode** — one line change in `ecosystem.config.js`:

```js
// Change this:
instances: 1,
exec_mode: 'fork',

// To this:
instances: 'max',   // or a fixed number like 4
exec_mode: 'cluster',
```

PM2 will fork one process per CPU core. The OS load balances incoming connections across them. Nginx already proxies to `localhost:3000` and does not need to change. This multiplies throughput by the number of cores on the instance.

One thing to verify before enabling cluster mode: the rate limiters in `server.js` use in-memory storage, which means each process has its own counter. Under cluster mode a user could send `instances × max` requests before hitting the limit. The fix is to back the rate limiter with Redis:

```js
const RedisStore = require('rate-limit-redis');
// Pass store: new RedisStore({ client: redisClient }) to each rateLimit() call
```

### 3. The Single Machine (next bottleneck, ~10,000+ concurrent users)

At this scale the EC2 instance itself becomes the ceiling — CPU, RAM, or network bandwidth.

The fix is **vertical scaling first** (larger instance type, costs minutes of downtime), then **horizontal scaling** (multiple instances behind a load balancer). Horizontal scaling requires:

- Moving PostgreSQL off the application server onto **RDS** (managed, with read replicas)
- Moving session/rate-limit state to **ElastiCache (Redis)**
- Putting an **Application Load Balancer** in front of two or more EC2 instances

At this point the architecture looks like:

```
Mobile clients
      ↓
 AWS ALB (load balancer)
      ↓
EC2 instance A    EC2 instance B    EC2 instance C
(PM2 cluster)     (PM2 cluster)     (PM2 cluster)
      ↓                 ↓                 ↓
        PgBouncer (on RDS proxy or separate instance)
                        ↓
              RDS PostgreSQL (primary)
                        ↓
              RDS Read Replica (for stats/export queries)
```

This architecture handles millions of users. It is still a monolith — one codebase, one deployment — just running on multiple machines.

### 4. The `/api/words` Endpoint (cacheable, not a scaling bottleneck but worth noting)

Words are static data — they do not change per user or per request. Every call for `en → hu at A1` returns the same response. These responses could be cached at the Nginx layer with a simple `proxy_cache` directive, or via **CloudFront** in front of the API. This would make the word sync cost zero compute for repeat requests.

---

## Specific Issues in the Current Code to Fix Before Scaling

These are not emergencies now but become problems under load.

**`getStats` runs 4 sequential queries per request.** The streak calculation in particular is a recursive CTE that scans all sessions for a user. Once users have months of history this gets expensive. These should be pre-computed on a schedule and cached in a `user_stats` table that is updated at session completion, not calculated on demand.

**`progress.controller.js` loops over sessions and achievements row-by-row in `syncProgress`.** The word progress sync uses `UNNEST` correctly, but sessions and achievements are inserted one at a time in a `for` loop. These should use the same batch-upsert pattern.

**The database and application are on the same machine.** This means a spike in Node CPU (e.g. bcrypt during a registration burst) competes for the same resources as PostgreSQL. Separating them is the most impactful first infrastructure step.

**No database indexes are defined in the repository.** The schema is created via the application but no `CREATE INDEX` statements are visible in the codebase. At minimum these indexes should exist:

```sql
-- Progress sync and review queries
CREATE INDEX IF NOT EXISTS idx_uwp_user_id ON user_word_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_uwp_next_review ON user_word_progress(user_id, next_review_date);

-- Session stats
CREATE INDEX IF NOT EXISTS idx_ls_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ls_start_time ON learning_sessions(user_id, start_time);

-- Word fetching
CREATE INDEX IF NOT EXISTS idx_words_lang_level ON words(source_lang, target_lang, cefr_level);
CREATE INDEX IF NOT EXISTS idx_words_freq ON words(source_lang, target_lang, frequency_rank);
```

---

## Summary: The Scaling Roadmap

| Stage | Users | Action | Effort |
|---|---|---|---|
| Now | < 500 | Current setup — no changes needed | — |
| Soon | ~500–2k | Add PgBouncer; move DB to separate instance or RDS | Low |
| Growing | ~2k–10k | PM2 cluster mode; Redis for rate limiting | Low |
| Scaling | ~10k–500k | ALB + multiple EC2 instances; RDS read replica | Medium |
| Large | ~500k–1M+ | CloudFront CDN for word/sentence responses; pre-computed stats | Medium |
| At Duolingo scale | 100M+ | Selective service extraction for genuinely independent workloads | High |

Microservices belong at the last row. Every row before it is solved by configuration changes and infrastructure additions to the existing monolith — no rewriting, no distributed transactions, no service mesh.
