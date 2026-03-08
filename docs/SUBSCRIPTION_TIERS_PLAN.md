# Subscription Tiers Plan: Free / Plus / Super

## Goal

Introduce three user subscription levels — Free, Plus, and Super — in a way that allows an admin to control, at runtime via the web UI, which features are available on which tier. No code changes or server redeployments are required to reassign a feature between tiers.

---

## Architecture Overview

The system spans four layers: database, backend, admin UI, and mobile client. The single source of truth for what each tier can access is a JSONB column in the database, editable from the admin panel.

---

## Layer 1: Database

Two new tables are introduced alongside a column addition on the existing `users` table.

`subscription_plans` stores the three plan definitions. Its `features` column is a JSONB object where each key is a feature identifier and its value is either a boolean (on/off gate) or an integer (a usage limit, for example `daily_word_limit: 20`). This is the object the admin edits at runtime.

`user_subscriptions` links a user to their active plan with `status`, `started_at`, and `expires_at` columns. This allows future support for expiring paid plans, trials, and grace periods.

The `users` table receives a `subscription_tier` column (`free`, `plus`, `super`) as a denormalized cache. This avoids a join on every authenticated request; it is kept in sync whenever `user_subscriptions` changes.

The three plan rows are seeded into `subscription_plans` on first migration with a sensible default feature set. The tier names themselves are fixed constants — only their feature values are admin-editable.

---

## Layer 2: Backend

**SubscriptionModel** reads plan feature sets from the database. It maintains a short in-memory cache (TTL ~60 seconds) per process so a database query is not made on every API request. The cache is invalidated whenever an admin saves a plan update via `updateSubscriptionPlan`. See Known Limitations for the multi-process behaviour of this cache.

**`checkFeature(featureKey)` middleware** is a reusable Express middleware factory. Any route that should be gated adds this middleware to its chain. It reads `req.user.subscription_tier` (set by the `authenticate` middleware from the JWT — see the Tier Propagation decision below), looks up that tier's feature map from `SubscriptionModel`, and returns `403` if the feature is disabled or a numeric limit is exceeded. Route handlers contain no subscription-awareness themselves.

**`KNOWN_FEATURE_KEYS`** is a shared constant module (`src/config/featureKeys.js`) that defines every valid feature key and its expected value type (`boolean` or `number`). It is the single source of truth for permissible keys. The `updateSubscriptionPlan` controller validates incoming feature objects against this allowlist and rejects any unknown key with a `400` error, preventing silent misconfiguration from the admin UI. The admin UI fetches this list from a dedicated endpoint (`GET /api/admin/subscription-plans/feature-keys`) to render form controls dynamically — no feature key names are hardcoded in the UI.

Three new admin controller methods handle plan management: `getSubscriptionPlans`, `getSubscriptionPlanById`, and `updateSubscriptionPlan`. Create and delete are intentionally omitted — the three tiers are fixed.

A new user-facing endpoint (`GET /api/subscriptions/me`) returns the calling user's active plan name and the public subset of the feature map (keys listed in `KNOWN_FEATURE_KEYS` that are not marked `internal`). This endpoint sits behind its own rate limiter, consistent with the existing `authLimiter` / `adminLimiter` pattern in `server.js`. The mobile client calls this on session start to drive UI gating.

---

## Layer 3: Admin UI

A new Subscription Plans resource page is added to the React Admin application. It lists the three plans. Clicking a plan opens an edit view that renders each feature key as a form control — a toggle for booleans and a number input for integer limits. Saving calls `PUT /api/admin/subscription-plans/:id`, which updates the database row and invalidates the server-side cache.

Adding a new feature gate requires only inserting a new key into each plan's JSONB object via this UI, and adding the `checkFeature` middleware call to the relevant route. No admin UI code changes are needed.

---

## Layer 4: Mobile Client

On session start, the app calls `GET /api/subscriptions/me` and stores the returned feature map in local state. UI components check this map to conditionally show or hide premium features. No tier names or feature key values are hardcoded in the client — the feature map is the sole contract between the server and the UI.

---

## Execution Phases

### Phase 1 — Database
Write and run the SQL migration to create `subscription_plans` and `user_subscriptions`, add `subscription_tier` to `users`, and seed the three default plans.

### Phase 2 — Backend
Build `SubscriptionModel` with caching, the `checkFeature` middleware, admin controller methods and routes for plan management, and the `GET /api/subscriptions/me` user endpoint.

### Phase 3 — Admin UI
Add the `SubscriptionPlans` resource to the React Admin app with list and edit views.

### Phase 4 — Feature Gating
Identify existing routes and features to gate per tier, apply the `checkFeature` middleware to each, and update the seeded feature maps in the database accordingly.

---

## Key Design Decisions

The three tier names (`free`, `plus`, `super`) are fixed application constants. Admins edit feature values within a tier, not the tier structure itself.

The mobile client is a pure consumer of the feature map returned from the API. No subscription logic lives on the client side.

### Decision 1: Tier Propagation into the Middleware Chain

`subscription_tier` is embedded in the JWT payload at login and token refresh time, alongside the existing `userId` and `email` fields. The `authenticate` middleware reads it from the decoded token and sets it on `req.user.subscription_tier`. No extra database query is made per request.

The consequence is that a tier change (for example, an admin upgrading a user from Free to Plus) takes effect when the user's current JWT expires and they receive a new one. JWT expiry should be kept short (recommended: 1 hour) to bound the delay. This tradeoff is explicitly accepted: it avoids a per-request DB lookup while keeping enforcement entirely server-side.

If an immediate tier change is required in future, the user's active sessions can be invalidated by a token revocation mechanism (out of scope for this phase).

### Decision 2: Feature Key Validation via KNOWN_FEATURE_KEYS

`src/config/featureKeys.js` exports a constant object defining every permissible feature key, its value type, and whether it is visible to the client. An example of the structure:

```js
// src/config/featureKeys.js
module.exports = {
  offline_mode:       { type: 'boolean', public: true },
  daily_word_limit:   { type: 'number',  public: true },
  advanced_stats:     { type: 'boolean', public: true },
  custom_word_lists:  { type: 'boolean', public: true },
  priority_support:   { type: 'boolean', public: false },
};
```

The `updateSubscriptionPlan` controller rejects any key not present in this object with a `400` error. Adding a new feature gate requires adding it here first, then seeding the value into each plan in the database. The admin UI's edit form is rendered from `GET /api/admin/subscription-plans/feature-keys`, which returns this list, so the UI always stays in sync with the backend without any separate UI code change.

### Decision 3: In-Process Cache and Multi-Instance Behaviour

The plan cache lives in the memory of the Node process that handles the request. This is sufficient for a single-server deployment (the current AWS setup documented in `docs/AWS_DEPLOYMENT_GUIDE.md`).

If the backend is scaled to multiple processes or instances (PM2 cluster mode, multiple EC2 instances behind a load balancer), each process holds an independent cache. A plan update will invalidate the cache only in the process that handled that admin request. All other processes will serve the previous feature map until their TTL (~60 seconds) expires naturally.

This is acceptable at current scale and is documented as a known limitation below. When horizontal scaling is needed, the migration path is to replace the in-process cache with a Redis `GET`/`SET` with TTL, and publish a cache-bust message on plan update using Redis Pub/Sub.

---

## Known Limitations

**Multi-process cache drift.** When running more than one backend process, a plan update may take up to 60 seconds to propagate to all processes. During that window, different processes may enforce different feature rules for the same tier. Acceptable at current single-server scale; Redis Pub/Sub is the planned upgrade path.

**Tier change delay.** A user's subscription tier is read from their JWT. A tier change assigned by an admin takes effect at the user's next login or token refresh, not immediately. The recommended JWT TTL of 1 hour bounds the maximum delay.

**Feature key typos have no runtime recovery.** If an unknown key is written to the database by any means other than the admin UI (for example, a direct SQL edit), the `checkFeature` middleware will treat the key as absent and default to denying access. This is a safe default but may be surprising during development.

---

_Created: for planning purposes prior to development_
_Last updated: gaps from scalability and security review resolved_
